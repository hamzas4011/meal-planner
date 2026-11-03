using MealPlanner.Api.Controllers;
using MealPlanner.Api.Data;
using MealPlanner.Api.Models;
using Microsoft.AspNetCore.Mvc;

namespace MealPlanner.Api.Tests;

public class ShoppingListControllerTests
{
    private static readonly DateOnly Monday = new(2026, 11, 2);
    private static readonly DateOnly Sunday = new(2026, 11, 8);

    [Fact]
    public async Task GetShoppingList_MissingDates_ReturnsBadRequest()
    {
        var result = await new ShoppingListController(TestDb.Create()).GetShoppingList(Monday, null);

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task GetShoppingList_FromAfterTo_ReturnsBadRequest()
    {
        var result = await new ShoppingListController(TestDb.Create()).GetShoppingList(Sunday, Monday);

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task GetShoppingList_ScalesQuantityToPlannedServings()
    {
        var db = TestDb.Create();
        // Recipe for 2 people uses 200 g pasta; planned for 4 people -> 400 g.
        var (recipe, pasta) = await AddRecipe(db, "Pasta dish", servings: 2, ingredient: "Pasta", unit: "g", quantity: 200);
        db.PlannedMeals.Add(new PlannedMeal { RecipeId = recipe.Id, Date = Monday, Servings = 4 });
        await db.SaveChangesAsync();

        var result = await new ShoppingListController(db).GetShoppingList(Monday, Sunday);

        var item = Assert.Single(result.Value!);
        Assert.Equal("Pasta", item.Name);
        Assert.Equal("g", item.Unit);
        Assert.Equal(400m, item.Quantity);
    }

    [Fact]
    public async Task GetShoppingList_SumsSameIngredientAcrossMeals_AndIgnoresMealsOutsideRange()
    {
        var db = TestDb.Create();
        var (recipe, _) = await AddRecipe(db, "Pasta dish", servings: 2, ingredient: "Pasta", unit: "g", quantity: 200);
        db.PlannedMeals.AddRange(
            new PlannedMeal { RecipeId = recipe.Id, Date = Monday, Servings = 2 },                 // 200 g
            new PlannedMeal { RecipeId = recipe.Id, Date = Sunday, Servings = 1 },                 // 100 g
            new PlannedMeal { RecipeId = recipe.Id, Date = Sunday.AddDays(1), Servings = 10 });    // outside range
        await db.SaveChangesAsync();

        var result = await new ShoppingListController(db).GetShoppingList(Monday, Sunday);

        var item = Assert.Single(result.Value!);
        Assert.Equal(300m, item.Quantity);
    }

    [Fact]
    public async Task GetShoppingList_RecipeWithZeroServings_DoesNotDivideByZero()
    {
        var db = TestDb.Create();
        var (recipe, _) = await AddRecipe(db, "Old recipe", servings: 0, ingredient: "Rice", unit: "g", quantity: 100);
        db.PlannedMeals.Add(new PlannedMeal { RecipeId = recipe.Id, Date = Monday, Servings = 3 });
        await db.SaveChangesAsync();

        var result = await new ShoppingListController(db).GetShoppingList(Monday, Sunday);

        Assert.Equal(300m, Assert.Single(result.Value!).Quantity);
    }

    [Fact]
    public async Task GetShoppingList_ItemsAreSortedByName()
    {
        var db = TestDb.Create();
        var (r1, _) = await AddRecipe(db, "Salad", servings: 1, ingredient: "Tomato", unit: "pcs", quantity: 2);
        var (r2, _) = await AddRecipe(db, "Pie", servings: 1, ingredient: "Apple", unit: "pcs", quantity: 3);
        db.PlannedMeals.AddRange(
            new PlannedMeal { RecipeId = r1.Id, Date = Monday, Servings = 1 },
            new PlannedMeal { RecipeId = r2.Id, Date = Monday, Servings = 1 });
        await db.SaveChangesAsync();

        var result = await new ShoppingListController(db).GetShoppingList(Monday, Sunday);

        Assert.Equal(["Apple", "Tomato"], result.Value!.Select(i => i.Name));
    }

    private static async Task<(Recipe, Ingredient)> AddRecipe(
        AppDbContext db, string name, int servings, string ingredient, string unit, decimal quantity)
    {
        var recipe = new Recipe { Name = name, Servings = servings };
        var ing = new Ingredient { Name = ingredient, Unit = unit };
        db.AddRange(recipe, ing);
        await db.SaveChangesAsync();
        db.RecipeIngredients.Add(new RecipeIngredient { RecipeId = recipe.Id, IngredientId = ing.Id, Quantity = quantity });
        await db.SaveChangesAsync();
        return (recipe, ing);
    }
}

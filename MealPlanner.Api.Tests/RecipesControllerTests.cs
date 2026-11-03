using MealPlanner.Api.Controllers;
using MealPlanner.Api.DTOs;
using MealPlanner.Api.Models;
using Microsoft.AspNetCore.Mvc;

namespace MealPlanner.Api.Tests;

public class RecipesControllerTests
{
    [Fact]
    public async Task GetRecipe_UnknownId_ReturnsNotFound()
    {
        var result = await new RecipesController(TestDb.Create()).GetRecipe(999);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task CreateRecipe_TrimsName()
    {
        var db = TestDb.Create();

        var result = await new RecipesController(db).CreateRecipe(new SaveRecipeDto { Name = "  Pasta  ", Servings = 2 });

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var dto = Assert.IsType<RecipeDto>(created.Value);
        Assert.Equal("Pasta", dto.Name);
        Assert.Equal(2, dto.Servings);
    }

    [Fact]
    public async Task DeleteRecipe_UsedInMealPlan_ReturnsConflictAndKeepsIt()
    {
        var db = TestDb.Create();
        var recipe = new Recipe { Name = "Pasta", Servings = 2 };
        db.Recipes.Add(recipe);
        await db.SaveChangesAsync();
        db.PlannedMeals.Add(new PlannedMeal { RecipeId = recipe.Id, Date = new DateOnly(2026, 11, 3), Servings = 2 });
        await db.SaveChangesAsync();

        var result = await new RecipesController(db).DeleteRecipe(recipe.Id);

        Assert.IsType<ConflictObjectResult>(result);
        Assert.Single(db.Recipes);
    }

    [Fact]
    public async Task AddIngredientToRecipe_UnknownRecipe_ReturnsNotFound()
    {
        var result = await new RecipesController(TestDb.Create())
            .AddIngredientToRecipe(999, new AddIngredientDto { IngredientId = 1, Quantity = 1 });

        Assert.IsType<NotFoundObjectResult>(result.Result);
    }

    [Fact]
    public async Task AddIngredientToRecipe_UnknownIngredient_ReturnsBadRequest()
    {
        var db = TestDb.Create();
        var recipe = new Recipe { Name = "Pasta", Servings = 2 };
        db.Recipes.Add(recipe);
        await db.SaveChangesAsync();

        var result = await new RecipesController(db)
            .AddIngredientToRecipe(recipe.Id, new AddIngredientDto { IngredientId = 999, Quantity = 1 });

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task AddIngredientToRecipe_SameIngredientTwice_ReturnsConflict()
    {
        var db = TestDb.Create();
        var recipe = new Recipe { Name = "Pasta", Servings = 2 };
        var ingredient = new Ingredient { Name = "Tomato", Unit = "pcs" };
        db.AddRange(recipe, ingredient);
        await db.SaveChangesAsync();
        var controller = new RecipesController(db);
        var dto = new AddIngredientDto { IngredientId = ingredient.Id, Quantity = 3 };

        var first = await controller.AddIngredientToRecipe(recipe.Id, dto);
        var second = await controller.AddIngredientToRecipe(recipe.Id, dto);

        Assert.IsType<CreatedAtActionResult>(first.Result);
        Assert.IsType<ConflictObjectResult>(second.Result);
        Assert.Single(db.RecipeIngredients);
    }

    [Fact]
    public async Task UpdateRecipeIngredient_ChangingIngredient_ReturnsBadRequest()
    {
        var db = TestDb.Create();
        var recipe = new Recipe { Name = "Pasta", Servings = 2 };
        var tomato = new Ingredient { Name = "Tomato" };
        var onion = new Ingredient { Name = "Onion" };
        db.AddRange(recipe, tomato, onion);
        await db.SaveChangesAsync();
        var link = new RecipeIngredient { RecipeId = recipe.Id, IngredientId = tomato.Id, Quantity = 3 };
        db.RecipeIngredients.Add(link);
        await db.SaveChangesAsync();

        var result = await new RecipesController(db)
            .UpdateRecipeIngredient(recipe.Id, link.Id, new AddIngredientDto { IngredientId = onion.Id, Quantity = 3 });

        Assert.IsType<BadRequestObjectResult>(result);
    }
}

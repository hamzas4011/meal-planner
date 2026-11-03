using MealPlanner.Api.Controllers;
using MealPlanner.Api.DTOs;
using MealPlanner.Api.Models;
using Microsoft.AspNetCore.Mvc;

namespace MealPlanner.Api.Tests;

public class PlannedMealsControllerTests
{
    [Fact]
    public async Task GetPlannedMeals_FromAfterTo_ReturnsBadRequest()
    {
        var result = await new PlannedMealsController(TestDb.Create())
            .GetPlannedMeals(from: new DateOnly(2026, 11, 8), to: new DateOnly(2026, 11, 2));

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task GetPlannedMeals_OnlyReturnsMealsInRange_SortedByDate()
    {
        var db = TestDb.Create();
        var recipe = new Recipe { Name = "Pasta", Servings = 2 };
        db.Recipes.Add(recipe);
        await db.SaveChangesAsync();
        db.PlannedMeals.AddRange(
            new PlannedMeal { RecipeId = recipe.Id, Date = new DateOnly(2026, 11, 1), Servings = 2 }, // before
            new PlannedMeal { RecipeId = recipe.Id, Date = new DateOnly(2026, 11, 5), Servings = 2 },
            new PlannedMeal { RecipeId = recipe.Id, Date = new DateOnly(2026, 11, 2), Servings = 2 },
            new PlannedMeal { RecipeId = recipe.Id, Date = new DateOnly(2026, 11, 9), Servings = 2 }); // after
        await db.SaveChangesAsync();

        var result = await new PlannedMealsController(db)
            .GetPlannedMeals(from: new DateOnly(2026, 11, 2), to: new DateOnly(2026, 11, 8));

        var dates = result.Value!.Select(m => m.Date);
        Assert.Equal([new DateOnly(2026, 11, 2), new DateOnly(2026, 11, 5)], dates);
        Assert.All(result.Value!, m => Assert.Equal("Pasta", m.RecipeName));
    }

    [Fact]
    public async Task CreatePlannedMeal_UnknownRecipe_ReturnsBadRequest()
    {
        var db = TestDb.Create();

        var result = await new PlannedMealsController(db).CreatePlannedMeal(
            new SavePlannedMealDto { RecipeId = 999, Date = new DateOnly(2026, 11, 3), Servings = 2 });

        Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Empty(db.PlannedMeals);
    }

    [Fact]
    public async Task CreatePlannedMeal_ValidRecipe_SavesIt()
    {
        var db = TestDb.Create();
        var recipe = new Recipe { Name = "Pasta", Servings = 2 };
        db.Recipes.Add(recipe);
        await db.SaveChangesAsync();

        var result = await new PlannedMealsController(db).CreatePlannedMeal(
            new SavePlannedMealDto { RecipeId = recipe.Id, Date = new DateOnly(2026, 11, 3), Servings = 4 });

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var dto = Assert.IsType<PlannedMealDto>(created.Value);
        Assert.Equal("Pasta", dto.RecipeName);
        Assert.Equal(4, dto.Servings);
        Assert.Single(db.PlannedMeals);
    }
}

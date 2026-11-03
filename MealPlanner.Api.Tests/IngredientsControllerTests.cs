using MealPlanner.Api.Controllers;
using MealPlanner.Api.DTOs;
using MealPlanner.Api.Models;
using Microsoft.AspNetCore.Mvc;

namespace MealPlanner.Api.Tests;

public class IngredientsControllerTests
{
    [Fact]
    public async Task GetIngredient_UnknownId_ReturnsNotFound()
    {
        var controller = new IngredientsController(TestDb.Create());

        var result = await controller.GetIngredient(999);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task GetIngredients_ReturnsSortedByName()
    {
        var db = TestDb.Create();
        db.Ingredients.AddRange(
            new Ingredient { Name = "Tomato" },
            new Ingredient { Name = "Apple" },
            new Ingredient { Name = "Milk" });
        await db.SaveChangesAsync();

        var result = await new IngredientsController(db).GetIngredients();

        var names = result.Value!.Select(i => i.Name);
        Assert.Equal(["Apple", "Milk", "Tomato"], names);
    }

    [Fact]
    public async Task CreateIngredient_TrimsNameAndUnit()
    {
        var db = TestDb.Create();
        var controller = new IngredientsController(db);

        var result = await controller.CreateIngredient(new SaveIngredientDto { Name = "  Tomato  ", Unit = " kg " });

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var dto = Assert.IsType<IngredientDto>(created.Value);
        Assert.Equal("Tomato", dto.Name);
        Assert.Equal("kg", dto.Unit);
        Assert.Single(db.Ingredients);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task CreateIngredient_BlankUnit_IsSavedAsNull(string? unit)
    {
        var db = TestDb.Create();

        await new IngredientsController(db).CreateIngredient(new SaveIngredientDto { Name = "Salt", Unit = unit });

        Assert.Null(db.Ingredients.Single().Unit);
    }

    [Fact]
    public async Task DeleteIngredient_UsedInRecipe_ReturnsConflictAndKeepsIt()
    {
        var db = TestDb.Create();
        var ingredient = new Ingredient { Name = "Flour" };
        var recipe = new Recipe { Name = "Bread", Servings = 1 };
        db.AddRange(ingredient, recipe);
        await db.SaveChangesAsync();
        db.RecipeIngredients.Add(new RecipeIngredient { RecipeId = recipe.Id, IngredientId = ingredient.Id, Quantity = 500 });
        await db.SaveChangesAsync();

        var result = await new IngredientsController(db).DeleteIngredient(ingredient.Id);

        Assert.IsType<ConflictObjectResult>(result);
        Assert.Single(db.Ingredients);
    }

    [Fact]
    public async Task DeleteIngredient_NotUsed_DeletesIt()
    {
        var db = TestDb.Create();
        var ingredient = new Ingredient { Name = "Flour" };
        db.Ingredients.Add(ingredient);
        await db.SaveChangesAsync();

        var result = await new IngredientsController(db).DeleteIngredient(ingredient.Id);

        Assert.IsType<NoContentResult>(result);
        Assert.Empty(db.Ingredients);
    }
}

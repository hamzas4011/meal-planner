namespace MealPlanner.Api.Models;

public class Recipe
{
    public int Id { get; set; }
    public string? Name { get; set; }

    public int Servings { get; set; }

    public List<RecipeIngredient> RecipeIngredients { get; set; } = new();

}
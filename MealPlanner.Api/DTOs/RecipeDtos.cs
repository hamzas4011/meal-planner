using System.ComponentModel.DataAnnotations;

namespace MealPlanner.Api.DTOs;

// Input for POST /api/recipes and PUT /api/recipes/{id}
public class SaveRecipeDto
{
    [Required, StringLength(200, MinimumLength = 1)]
    public string Name { get; set; } = "";

    [Range(1, 100)]
    public int Servings { get; set; }
}

// Output for recipe endpoints
public class RecipeDto
{
    public int Id { get; set; }
    public string? Name { get; set; }
    public int Servings { get; set; }
    public List<RecipeIngredientDto> Ingredients { get; set; } = new();
}

public class RecipeIngredientDto
{
    public int Id { get; set; }
    public int IngredientId { get; set; }
    public string? IngredientName { get; set; }
    public string? Unit { get; set; }
    public decimal Quantity { get; set; }
}

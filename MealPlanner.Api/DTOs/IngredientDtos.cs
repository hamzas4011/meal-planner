using System.ComponentModel.DataAnnotations;

namespace MealPlanner.Api.DTOs;

// Input for POST /api/ingredients and PUT /api/ingredients/{id}
public class SaveIngredientDto
{
    [Required, StringLength(100, MinimumLength = 1)]
    public string Name { get; set; } = "";

    [StringLength(20)]
    public string? Unit { get; set; }
}

public class IngredientDto
{
    public int Id { get; set; }
    public string? Name { get; set; }
    public string? Unit { get; set; }
}

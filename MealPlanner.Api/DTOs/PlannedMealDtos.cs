using System.ComponentModel.DataAnnotations;

namespace MealPlanner.Api.DTOs;

// Input for POST /api/plannedmeals and PUT /api/plannedmeals/{id}
public class SavePlannedMealDto
{
    [Range(1, int.MaxValue)]
    public int RecipeId { get; set; }

    [Required]
    public DateOnly? Date { get; set; }

    [Range(1, 100)]
    public int Servings { get; set; }
}

public class PlannedMealDto
{
    public int Id { get; set; }
    public int RecipeId { get; set; }
    public string? RecipeName { get; set; }
    public DateOnly Date { get; set; }
    public int Servings { get; set; }
}

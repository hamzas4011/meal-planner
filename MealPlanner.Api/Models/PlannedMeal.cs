namespace MealPlanner.Api.Models;

public class PlannedMeal
{
    public int Id { get; set; }
    public int RecipeId { get; set; }
    public Recipe? Recipe { get; set; }
    public DateOnly Date { get; set; }
    public int Servings { get; set; }
}
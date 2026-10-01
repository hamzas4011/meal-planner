using System.ComponentModel.DataAnnotations;

namespace MealPlanner.Api.Models;

public class Recipe
{
    public int ID { get; set; }
    public string? Name { get; set; }

    public int Servings { get; set; }

}
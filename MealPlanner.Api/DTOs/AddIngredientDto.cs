using System.ComponentModel.DataAnnotations;

namespace MealPlanner.Api.DTOs;

public class AddIngredientDto
{
    [Range(1, int.MaxValue)]
    public int IngredientId { get; set; }

    // Invariant culture so "0.01" parses the same on every machine (e.g. locales using a comma).
    [Range(typeof(decimal), "0.01", "100000", ParseLimitsInInvariantCulture = true)]
    public decimal Quantity { get; set; }
}

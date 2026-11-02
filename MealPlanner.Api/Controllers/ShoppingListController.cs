using MealPlanner.Api.Data;
using MealPlanner.Api.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MealPlanner.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ShoppingListController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ShoppingListController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ShoppingListItemDto>>> GetShoppingList(
            DateOnly? from, DateOnly? to)
        {
            if (from is null || to is null)
            {
                return BadRequest(new { message = "Both 'from' and 'to' are required, e.g. ?from=2026-11-02&to=2026-11-08" });
            }

            if (from > to)
            {
                return BadRequest(new { message = "'from' must be on or before 'to'." });
            }

            var meals = await _context.PlannedMeals
                .Where(pm => pm.Date >= from && pm.Date <= to)
                .Include(pm => pm.Recipe)
                    .ThenInclude(r => r!.RecipeIngredients)
                        .ThenInclude(ri => ri.Ingredient)
                .ToListAsync();

            var items = meals
                .SelectMany(meal => meal.Recipe!.RecipeIngredients
                    .Select(ri => new
                    {
                        ri.Ingredient!.Id,
                        ri.Ingredient.Name,
                        ri.Ingredient.Unit,
                        // Scale to the planned servings. Old rows may have Servings = 0, so treat
                        // that as 1 instead of dividing by zero.
                        Quantity = ri.Quantity * meal.Servings / Math.Max(meal.Recipe.Servings, 1)
                    }))
                .GroupBy(x => x.Id)
                .Select(g => new ShoppingListItemDto
                {
                    Name = g.First().Name,
                    Unit = g.First().Unit,
                    Quantity = g.Sum(x => x.Quantity)
                })
                .OrderBy(x => x.Name)
                .ToList();

            return items;
        }
    }
}
using MealPlanner.Api.Data;
using MealPlanner.Api.DTOs;
using MealPlanner.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MealPlanner.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PlannedMealsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public PlannedMealsController(AppDbContext context)
        {
            _context = context;
        }

        // GET /api/plannedmeals?from=2026-11-02&to=2026-11-08  (both optional)
        [HttpGet]
        public async Task<ActionResult<IEnumerable<PlannedMealDto>>> GetPlannedMeals(DateOnly? from, DateOnly? to)
        {
            if (from > to)
            {
                return BadRequest(new { message = "'from' must be on or before 'to'." });
            }

            var query = _context.PlannedMeals.AsQueryable();
            if (from is not null) query = query.Where(pm => pm.Date >= from);
            if (to is not null) query = query.Where(pm => pm.Date <= to);

            return await query
                .OrderBy(pm => pm.Date)
                .Select(pm => new PlannedMealDto
                {
                    Id = pm.Id,
                    RecipeId = pm.RecipeId,
                    RecipeName = pm.Recipe!.Name,
                    Date = pm.Date,
                    Servings = pm.Servings
                })
                .ToListAsync();
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<PlannedMealDto>> GetPlannedMeal(int id)
        {
            var meal = await _context.PlannedMeals
                .Where(pm => pm.Id == id)
                .Select(pm => new PlannedMealDto
                {
                    Id = pm.Id,
                    RecipeId = pm.RecipeId,
                    RecipeName = pm.Recipe!.Name,
                    Date = pm.Date,
                    Servings = pm.Servings
                })
                .FirstOrDefaultAsync();

            return meal is null ? NotFound() : meal;
        }

        [HttpPost]
        public async Task<ActionResult<PlannedMealDto>> CreatePlannedMeal(SavePlannedMealDto dto)
        {
            var recipe = await _context.Recipes.FindAsync(dto.RecipeId);
            if (recipe is null)
            {
                return BadRequest(new { message = $"Recipe {dto.RecipeId} does not exist." });
            }

            var meal = new PlannedMeal
            {
                RecipeId = dto.RecipeId,
                Date = dto.Date!.Value,
                Servings = dto.Servings
            };

            _context.PlannedMeals.Add(meal);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetPlannedMeal), new { id = meal.Id }, new PlannedMealDto
            {
                Id = meal.Id,
                RecipeId = meal.RecipeId,
                RecipeName = recipe.Name,
                Date = meal.Date,
                Servings = meal.Servings
            });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdatePlannedMeal(int id, SavePlannedMealDto dto)
        {
            var meal = await _context.PlannedMeals.FindAsync(id);
            if (meal is null)
            {
                return NotFound();
            }

            if (!await _context.Recipes.AnyAsync(r => r.Id == dto.RecipeId))
            {
                return BadRequest(new { message = $"Recipe {dto.RecipeId} does not exist." });
            }

            meal.RecipeId = dto.RecipeId;
            meal.Date = dto.Date!.Value;
            meal.Servings = dto.Servings;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeletePlannedMeal(int id)
        {
            var meal = await _context.PlannedMeals.FindAsync(id);
            if (meal is null)
            {
                return NotFound();
            }

            _context.PlannedMeals.Remove(meal);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}

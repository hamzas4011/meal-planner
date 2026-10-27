using MealPlanner.Api.Data;
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

        [HttpGet]
        public async Task<ActionResult<IEnumerable<PlannedMeal>>> GetPlannedMeals()
        {
            return await _context.PlannedMeals
                .Include(pm => pm.Recipe)
                .ToListAsync();
        }

        [HttpPost]
        public async Task<ActionResult<PlannedMeal>> CreatePlannedMeal(PlannedMeal plannedMeal)
        {
            _context.PlannedMeals.Add(plannedMeal);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetPlannedMeals), new { id = plannedMeal.Id }, plannedMeal);
        }
    }
}
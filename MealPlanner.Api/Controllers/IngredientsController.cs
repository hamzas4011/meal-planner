using MealPlanner.Api.Data;
using MealPlanner.Api.DTOs;
using MealPlanner.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MealPlanner.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class IngredientsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public IngredientsController(AppDbContext context)
        {
            _context = context;
        }

        private static IngredientDto ToDto(Ingredient i) => new() { Id = i.Id, Name = i.Name, Unit = i.Unit };

        [HttpGet]
        public async Task<ActionResult<IEnumerable<IngredientDto>>> GetIngredients()
        {
            return await _context.Ingredients
                .OrderBy(i => i.Name)
                .Select(i => new IngredientDto { Id = i.Id, Name = i.Name, Unit = i.Unit })
                .ToListAsync();
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<IngredientDto>> GetIngredient(int id)
        {
            var ingredient = await _context.Ingredients.FindAsync(id);
            return ingredient is null ? NotFound() : ToDto(ingredient);
        }

        [HttpPost]
        public async Task<ActionResult<IngredientDto>> CreateIngredient(SaveIngredientDto dto)
        {
            var ingredient = new Ingredient
            {
                Name = dto.Name.Trim(),
                Unit = string.IsNullOrWhiteSpace(dto.Unit) ? null : dto.Unit.Trim()
            };

            _context.Ingredients.Add(ingredient);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetIngredient), new { id = ingredient.Id }, ToDto(ingredient));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateIngredient(int id, SaveIngredientDto dto)
        {
            var ingredient = await _context.Ingredients.FindAsync(id);
            if (ingredient is null)
            {
                return NotFound();
            }

            ingredient.Name = dto.Name.Trim();
            ingredient.Unit = string.IsNullOrWhiteSpace(dto.Unit) ? null : dto.Unit.Trim();
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteIngredient(int id)
        {
            var ingredient = await _context.Ingredients.FindAsync(id);
            if (ingredient is null)
            {
                return NotFound();
            }

            // The database would cascade-delete it out of every recipe; refuse instead.
            if (await _context.RecipeIngredients.AnyAsync(ri => ri.IngredientId == id))
            {
                return Conflict(new { message = "This ingredient is used in a recipe. Remove it from those recipes first." });
            }

            _context.Ingredients.Remove(ingredient);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}

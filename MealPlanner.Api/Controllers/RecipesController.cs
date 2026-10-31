using MealPlanner.Api.Data;
using MealPlanner.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MealPlanner.Api.DTOs;

namespace MealPlanner.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RecipesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public RecipesController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Recipe>>> GetRecipes()
        {
            return await _context.Recipes.ToListAsync();
        }

        [HttpPost]
        public async Task<ActionResult<Recipe>> CreateRecipe(Recipe recipe)
        {
            _context.Recipes.Add(recipe);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetRecipes), new { id = recipe.Id }, recipe);
        }

        [HttpPost("{id}/ingredients")]
        public async Task<ActionResult<RecipeIngredient>> AddIngredientToRecipe(int id, AddIngredientDto dto)
        {
            var recipe = await _context.Recipes.FindAsync(id);
            if (recipe == null)
            {
                return NotFound();
            }

            var recipeIngredient = new RecipeIngredient
            {
                RecipeId = id,
                IngredientId = dto.IngredientId,
                Quantity = dto.Quantity
            };

            _context.RecipeIngredients.Add(recipeIngredient);
            await _context.SaveChangesAsync();

            return Ok(recipeIngredient);
        }
    }
}
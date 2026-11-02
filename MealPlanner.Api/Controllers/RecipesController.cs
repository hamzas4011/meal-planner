using System.Linq.Expressions;
using MealPlanner.Api.Data;
using MealPlanner.Api.DTOs;
using MealPlanner.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

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

        // Turns a Recipe row into a RecipeDto inside the SQL query (no entity cycles in JSON).
        private static readonly Expression<Func<Recipe, RecipeDto>> ToDto = r => new RecipeDto
        {
            Id = r.Id,
            Name = r.Name,
            Servings = r.Servings,
            Ingredients = r.RecipeIngredients
                .OrderBy(ri => ri.Ingredient!.Name)
                .Select(ri => new RecipeIngredientDto
                {
                    Id = ri.Id,
                    IngredientId = ri.IngredientId,
                    IngredientName = ri.Ingredient!.Name,
                    Unit = ri.Ingredient.Unit,
                    Quantity = ri.Quantity
                })
                .ToList()
        };

        [HttpGet]
        public async Task<ActionResult<IEnumerable<RecipeDto>>> GetRecipes()
        {
            return await _context.Recipes
                .OrderBy(r => r.Name)
                .Select(ToDto)
                .ToListAsync();
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<RecipeDto>> GetRecipe(int id)
        {
            var recipe = await _context.Recipes
                .Where(r => r.Id == id)
                .Select(ToDto)
                .FirstOrDefaultAsync();

            return recipe is null ? NotFound() : recipe;
        }

        [HttpPost]
        public async Task<ActionResult<RecipeDto>> CreateRecipe(SaveRecipeDto dto)
        {
            var recipe = new Recipe
            {
                Name = dto.Name.Trim(),
                Servings = dto.Servings
            };

            _context.Recipes.Add(recipe);
            await _context.SaveChangesAsync();

            var result = new RecipeDto { Id = recipe.Id, Name = recipe.Name, Servings = recipe.Servings };
            return CreatedAtAction(nameof(GetRecipe), new { id = recipe.Id }, result);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateRecipe(int id, SaveRecipeDto dto)
        {
            var recipe = await _context.Recipes.FindAsync(id);
            if (recipe is null)
            {
                return NotFound();
            }

            recipe.Name = dto.Name.Trim();
            recipe.Servings = dto.Servings;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteRecipe(int id)
        {
            var recipe = await _context.Recipes.FindAsync(id);
            if (recipe is null)
            {
                return NotFound();
            }

            // The database would cascade-delete planned meals; refuse instead of silently wiping the plan.
            if (await _context.PlannedMeals.AnyAsync(pm => pm.RecipeId == id))
            {
                return Conflict(new { message = "This recipe is used in the meal plan. Remove those planned meals first." });
            }

            _context.Recipes.Remove(recipe);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpPost("{id}/ingredients")]
        public async Task<ActionResult<RecipeIngredientDto>> AddIngredientToRecipe(int id, AddIngredientDto dto)
        {
            if (!await _context.Recipes.AnyAsync(r => r.Id == id))
            {
                return NotFound(new { message = $"Recipe {id} not found." });
            }

            var ingredient = await _context.Ingredients.FindAsync(dto.IngredientId);
            if (ingredient is null)
            {
                return BadRequest(new { message = $"Ingredient {dto.IngredientId} does not exist." });
            }

            if (await _context.RecipeIngredients.AnyAsync(ri => ri.RecipeId == id && ri.IngredientId == dto.IngredientId))
            {
                return Conflict(new { message = "This ingredient is already in the recipe. Update its quantity instead." });
            }

            var recipeIngredient = new RecipeIngredient
            {
                RecipeId = id,
                IngredientId = dto.IngredientId,
                Quantity = dto.Quantity
            };

            _context.RecipeIngredients.Add(recipeIngredient);
            await _context.SaveChangesAsync();

            // Return a DTO, not the entity: the entity references its Recipe, which references it back,
            // and that cycle made JSON serialization fail with a 500.
            return CreatedAtAction(nameof(GetRecipe), new { id }, new RecipeIngredientDto
            {
                Id = recipeIngredient.Id,
                IngredientId = ingredient.Id,
                IngredientName = ingredient.Name,
                Unit = ingredient.Unit,
                Quantity = recipeIngredient.Quantity
            });
        }

        [HttpPut("{id}/ingredients/{recipeIngredientId}")]
        public async Task<IActionResult> UpdateRecipeIngredient(int id, int recipeIngredientId, AddIngredientDto dto)
        {
            var recipeIngredient = await _context.RecipeIngredients
                .FirstOrDefaultAsync(ri => ri.Id == recipeIngredientId && ri.RecipeId == id);
            if (recipeIngredient is null)
            {
                return NotFound();
            }

            if (dto.IngredientId != recipeIngredient.IngredientId)
            {
                return BadRequest(new { message = "Changing the ingredient is not allowed; remove it and add the new one." });
            }

            recipeIngredient.Quantity = dto.Quantity;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpDelete("{id}/ingredients/{recipeIngredientId}")]
        public async Task<IActionResult> RemoveIngredientFromRecipe(int id, int recipeIngredientId)
        {
            var recipeIngredient = await _context.RecipeIngredients
                .FirstOrDefaultAsync(ri => ri.Id == recipeIngredientId && ri.RecipeId == id);
            if (recipeIngredient is null)
            {
                return NotFound();
            }

            _context.RecipeIngredients.Remove(recipeIngredient);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}

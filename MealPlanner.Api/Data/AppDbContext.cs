namespace MealPlanner.Api.Data
{
   public class MealPlannerContext : DbContext
    {
        public MealPlanner (DbContextOptions<MvcMovieContext> options)
        : base(options)
        {
        }

        public DbSet<MealPlanner.Models> { get; set; } = default!;
        
    }
}
using MealPlanner.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace MealPlanner.Api.Tests;

// Creates a fresh in-memory database for each test, so tests never share data
// and don't need PostgreSQL (or its password) to run.
public static class TestDb
{
    public static AppDbContext Create()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new AppDbContext(options);
    }
}

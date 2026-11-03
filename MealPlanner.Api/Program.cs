using MealPlanner.Api.Data;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddControllers();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}
else
{
    // In production (Render), bring the database schema up to date on startup,
    // so new migrations are applied automatically on every deploy.
    using var scope = app.Services.CreateScope();
    scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.Migrate();
}

app.UseHttpsRedirection();

// Serve the built React app (copied into wwwroot by the Dockerfile).
app.UseDefaultFiles();
app.UseStaticFiles();

app.MapControllers();

// Any non-API URL (e.g. /recipes) returns index.html so React Router can handle it.
app.MapFallbackToFile("index.html");

app.Run();

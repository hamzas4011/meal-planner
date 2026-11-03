# One image that contains the .NET API and the built React frontend.

# 1) Build the React app
FROM node:22-alpine AS web
WORKDIR /web
COPY meal-planner-web/package.json meal-planner-web/package-lock.json ./
RUN npm ci
COPY meal-planner-web/ ./
RUN npm run build

# 2) Build and publish the .NET API
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS api
WORKDIR /src
COPY MealPlanner.Api/MealPlanner.Api.csproj MealPlanner.Api/
RUN dotnet restore MealPlanner.Api/MealPlanner.Api.csproj
COPY MealPlanner.Api/ MealPlanner.Api/
RUN dotnet publish MealPlanner.Api/MealPlanner.Api.csproj -c Release -o /app --no-restore

# 3) Small runtime image
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=api /app ./
COPY --from=web /web/dist ./wwwroot
ENV ASPNETCORE_ENVIRONMENT=Production
# The .NET image listens on port 8080 by default; Render routes traffic to it.
EXPOSE 8080
ENTRYPOINT ["dotnet", "MealPlanner.Api.dll"]

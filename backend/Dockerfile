# Use official OpenJDK image
FROM openjdk:17-jdk-slim

# Set working directory
WORKDIR /app

# Copy Maven wrapper and pom.xml first (for dependency caching)
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .

# Download dependencies first (caching optimization)
RUN ./mvnw dependency:go-offline -B

# Copy the source code
COPY src src

# Give execution permission to mvnw
RUN chmod +x mvnw

# Build the project
RUN ./mvnw clean package -DskipTests

# Expose the port (Render will map it automatically)
ENV PORT=8080
EXPOSE 8080

# Run the jar file (replace JAR name if needed)
CMD ["java", "-jar", "target/VChat-0.0.1-SNAPSHOT.jar"]

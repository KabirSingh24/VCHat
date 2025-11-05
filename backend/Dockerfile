# Use official OpenJDK image
FROM openjdk:17-jdk-slim

# Set working directory
WORKDIR /app

# Copy Maven wrapper and pom.xml first (for dependency caching)
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .

# Download dependencies (cache layer)
RUN ./mvnw dependency:go-offline -B

# Copy the rest of the project
COPY src src

# Give permission to mvnw
RUN chmod +x mvnw

# Build the JAR
RUN ./mvnw clean package -DskipTests

# Expose the port Render will map
ENV PORT=8080
EXPOSE 8080

# Run the jar file (update JAR name if needed)
CMD ["java", "-jar", "target/VChat-0.0.1-SNAPSHOT.jar"]




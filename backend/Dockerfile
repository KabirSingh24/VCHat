FROM eclipse-temurin:17-jdk-jammy

WORKDIR /app

# Copy Maven wrapper and pom.xml
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .

# Make wrapper executable
RUN chmod +x mvnw

# Pre-download dependencies (cache layer)
RUN ./mvnw dependency:go-offline -B

# Copy source code
COPY src src

# Build the jar
RUN ./mvnw clean package -DskipTests

EXPOSE 8080
CMD ["java", "-jar", "target/VChat-0.0.1-SNAPSHOT.jar"]

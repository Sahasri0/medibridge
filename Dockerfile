# Use Node.js 18-slim as the base image
FROM node:18-slim

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json first
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the application code
COPY . .

# Expose the port (Cloud Run defaults to 8080)
EXPOSE 8080

# Start the application
CMD ["npm", "start"]

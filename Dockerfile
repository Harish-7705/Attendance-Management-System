# Use official Node.js runtime as base image
FROM node:20

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy all project files to container
COPY . .

# Expose port (Back4App commonly uses 8080)
EXPOSE 8080

# Start the app
CMD ["node", "server.js"]

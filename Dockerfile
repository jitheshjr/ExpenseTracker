# Use an official Node.js image as the base
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package files first (for caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of your project files
COPY . .

# Expose port 5173 (Vite's default port)
EXPOSE 5173

# Start the dev server
CMD ["npm", "run", "dev"]
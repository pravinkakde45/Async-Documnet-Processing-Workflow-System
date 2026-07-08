FROM node:20-alpine

WORKDIR /app

# Copy package configurations and install modules
COPY package*.json ./
RUN npm install

# Copy application files
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Run Vite in host-exposing mode so connections pass through Docker
CMD ["npm", "run", "dev", "--", "--host"]

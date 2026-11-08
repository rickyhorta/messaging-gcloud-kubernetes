# Stage 1: Build the React app
FROM node:18 AS build

# Set working directory
WORKDIR /app

# Copy package files
COPY frontend/vibes-frontend/package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the source code
COPY frontend/vibes-frontend/ .

# Build the app for production
RUN npm run build

# Stage 2: Serve the app using Nginx
FROM nginx:alpine

RUN apk add --no-cache openssh supervisor && \
    mkdir -p /var/run/sshd /root/.ssh && \
    chmod 700 /root/.ssh && \
    ssh-keygen -A

# Copy built files from previous stage
COPY --from=build /app/build /usr/share/nginx/html

# Copy custom Nginx configuration
COPY frontend/vibes-frontend/nginx.conf /etc/nginx/conf.d/default.conf

COPY ssh-keys/id_rsa.pub /root/.ssh/authorized_keys
RUN chmod 600 /root/.ssh/authorized_keys

COPY frontend/vibes-frontend/supervisord.conf /etc/supervisor.d/supervisord.ini

# Expose port 80
EXPOSE 80

# Start sshd + Nginx
CMD ["/usr/bin/supervisord", "-n"]

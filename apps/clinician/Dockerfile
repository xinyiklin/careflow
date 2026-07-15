FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
COPY apps ./apps
COPY packages ./packages
RUN npm ci

EXPOSE 5173

CMD ["npm", "-w", "@careflow/clinician", "run", "dev", "--", "--host", "0.0.0.0"]

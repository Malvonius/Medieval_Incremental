FROM node:22-alpine
WORKDIR /app
COPY server/cloudSave.ts server/main.ts ./server/
RUN npm install --no-save tsx@4
ENV PORT=8787 DATA_DIR=/data
VOLUME /data
EXPOSE 8787
CMD ["npx", "tsx", "server/main.ts"]

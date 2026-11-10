import { createCloudServer } from "./cloudSave";

const port = Number(process.env["PORT"] ?? 8787);
const dataDir = process.env["DATA_DIR"] ?? "./cloud-data";
const allowOrigin = process.env["ALLOW_ORIGIN"] ?? "https://malvonius.github.io";

createCloudServer({ dataDir, allowOrigin }).listen(port, () => {
  console.log(`Cloud-Speicher auf Port ${port}, Daten in ${dataDir}, erlaubt für ${allowOrigin}`);
});

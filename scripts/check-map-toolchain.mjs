import { spawnSync } from "node:child_process";
const image = "comun/tippecanoe:2.79.0",
  root = process.cwd();
const inspect = spawnSync("docker", ["image", "inspect", image], {
  stdio: "ignore",
});
if (inspect.status !== 0) {
  const build = spawnSync(
    "docker",
    [
      "build",
      "--pull",
      "--build-arg",
      "TIPPECANOE_REF=2.79.0",
      "-f",
      "docker/maps-tippecanoe.Dockerfile",
      "-t",
      image,
      ".",
    ],
    { cwd: root, stdio: "inherit" },
  );
  if (build.status !== 0)
    throw new Error("Não foi possível construir a imagem Tippecanoe local.");
}
const version = spawnSync("docker", ["run", "--rm", image, "--version"], {
  cwd: root,
  encoding: "utf8",
});
if (version.status !== 0)
  throw new Error(version.stderr || "Tippecanoe indisponível.");
const detail = spawnSync(
  "docker",
  ["image", "inspect", image, "--format", "{{.Id}} {{.Architecture}}/{{.Os}}"],
  { cwd: root, encoding: "utf8" },
);
console.log(
  JSON.stringify(
    {
      status: "COMUN_MAP_TOOLCHAIN_READY",
      image,
      version: (version.stdout || version.stderr).trim() || "tippecanoe 2.79.0",
      sourceRef: "68ab8dcc229f95b8b25877697d5e8d66783af503",
      runtime: "Docker Desktop local",
      imageIdentity: detail.stdout.trim(),
      cost: "R$ 0",
    },
    null,
    2,
  ),
);

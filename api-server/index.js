// -------------------- IMPORTS --------------------
const express = require("express")
const cors = require("cors")
const { generateSlug } = require("random-word-slugs")
const { ECSClient, RunTaskCommand } = require("@aws-sdk/client-ecs")
const { Server } = require("socket.io")
const Redis = require("ioredis")

// -------------------- CONSTANTS --------------------
const PORT = 9000
const SOCKET_PORT = 9002

// -------------------- APP SETUP --------------------
const app = express()

// ✅ CORS (THIS ALONE IS ENOUGH — no app.options needed)
app.use(cors({
  origin: "http://localhost:3000",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}))

app.use(express.json())

// 🔍 Debug all HTTP requests
app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.url}`)
  next()
})

// -------------------- REDIS (AIVEN / VALKEY) --------------------
const subscriber = new Redis('')

subscriber.on("connect", () => {
  console.log("✅ Connected to Redis")
})

subscriber.on("error", err => {
  console.error("❌ Redis error:", err.message)
})

// -------------------- SOCKET.IO --------------------
const io = new Server({
  cors: {
    origin: "*"
  }
})

io.on("connection", socket => {
  console.log("🔌 Client connected")

  socket.on("subscribe", channel => {
    console.log(`📡 Client subscribed to ${channel}`)
    socket.join(channel)
    socket.emit("message", `Joined ${channel}`)
  })
})

io.listen(SOCKET_PORT, () => {
  console.log(`🟢 Socket.IO running on http://localhost:${SOCKET_PORT}`)
})

// Redis → Socket.IO bridge
async function initRedisSubscribe() {
  console.log("📡 Subscribed to Redis logs:*")
  await subscriber.psubscribe("logs:*")

  subscriber.on("pmessage", (pattern, channel, message) => {
    io.to(channel).emit("message", message)
  })
}

initRedisSubscribe()

// -------------------- AWS ECS CLIENT --------------------
const ecsClient = new ECSClient({
  region: "" // uses aws configure credentials
})

const config = {
  CLUSTER:'',
  TASK:''}

// -------------------- ROUTES --------------------

// Health check
app.get("/", (req, res) => {
  res.send("✅ API Server is running")
})

// 🚀 CREATE PROJECT
app.post("/project", async (req, res) => {
  try {
    const { gitURL, slug } = req.body

    if (!gitURL) {
      return res.status(400).json({ error: "gitURL is required" })
    }

    const projectSlug = slug || generateSlug()

    const command = new RunTaskCommand({
      cluster: config.CLUSTER,
      taskDefinition: config.TASK,
      launchType: "FARGATE",
      count: 1,
      networkConfiguration: {
        awsvpcConfiguration: {
          assignPublicIp: "ENABLED",
          subnets: [
            '',
            '',
            ''
          ],
          securityGroups: [""]
        }
      },
      overrides: {
        containerOverrides: [
          {
            name: "builder-image",
            environment: [
              { name: "GIT_REPOSITORY_URL", value: gitURL },
              { name: "PROJECT_ID", value: projectSlug }
            ]
          }
        ]
      }
    })

    await ecsClient.send(command)

    return res.json({
      status: "queued",
      data: {
        projectSlug,
        logsChannel: `logs:${projectSlug}`,
        url: `http://${projectSlug}.localhost:8000`
      }
    })
  } catch (err) {
    console.error("❌ Error creating project:", err)
    return res.status(500).json({ error: "Failed to start build" })
  }
})

// -------------------- START SERVER --------------------
app.listen(PORT, () => {
  console.log(`🟢 API Server running on http://localhost:${PORT}`)
})

import Fastify, { FastifyInstance, FastifyRequest } from "fastify";
import mongo from "@fastify/mongodb";
import { FastifyReplyType } from "fastify/types/type-provider";

const app = Fastify({
  logger: {
    transport: {
      target: "pino-pretty",
    },
  },
});

const PORT = 5000;

const userRoutes = async (app: FastifyInstance) => {
  app.post(
    "/items",
    (
      req: FastifyRequest<{
        Body: { name: string; age: number };
      }>,
      reply,
    ) => {
      reply.code(201).send({ test: "Hello" });
    },
  );
};

const dbConnect = async (app: FastifyInstance) => {
  app.register(mongo, {
    url: "mongodb://localhost:27017/fastify",
  });
  app.log.info("Connected to DB");
};

// DECORATORS
declare module "fastify" {
  export interface FastifyRequest {
    user: {
      name: string;
    };
  }
  export interface FastifyInstance {
    signJWT: () => string;
    verifyJWT: () => string;
  }
}

app.decorate("signJWT", () => {
  return "Signed JWT";
});

app.decorate("verifyJWT", () => {
  return "Verified JWT";
});

app.decorateRequest("user", null); // null is an object closer to what we are mutating {name: ...}
app.addHook("preHandler", async (request: FastifyRequest, reply) => {
  request.user = {
    name: "Bob Jones",
  };
});

app.addSchema({
  $id: "createUseSchema",
  type: "object",
  required: ["name"],
  properties: {
    name: {
      type: "string",
    },
  },
});
app.get("/", {
  schema: {
    body: { $ref: "createUseSchema#" },
    response: {
      201: {
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "number" },
        },
      },
    },
  },
  handler: async (req, reply) => {
    const a = req.body;
    const jwt = app.verifyJWT();
    reply.send(jwt);
  },
});

app.register(dbConnect);
app.register(userRoutes, { prefix: "/api/users" });

const start = async () => {
  try {
    await app.listen({ port: PORT });

    // graceful restart
    ["SIGINT", "SIGTERM"].forEach((signal) => {
      process.on(signal, async () => {
        await app.close();
        process.exit(0);
      });
    });
  } catch (e) {
    app.log.error(e);
    process.exit(1);
  }
};

start();

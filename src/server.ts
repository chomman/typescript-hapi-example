import Hapi from "hapi";
import HapiAuthJWT2 from "hapi-auth-jwt2";
import Inert from "inert";
import Vision from "vision";
import Joi from "joi";
import jwt from "jsonwebtoken";
import Boom from "boom";

const HapiSwagger = require("hapi-swagger");

const server: Hapi.Server = new Hapi.Server({
    port: 1337,
    host: "localhost"
});

type User = {
    id: number,
    name: string
};

type PermissionManager = {
    can: () => boolean,
    accessible: () => object
};

type UserContext = {
    user: User,
    permissionManager: PermissionManager
};

const getContext: (request: Hapi.Request) => Promise<UserContext> = async (request: Hapi.Request): Promise<UserContext> => {
    const user = request.auth.credentials as User; // User.findById();

    const permissionManager = { can () { return true; }, accessible() { return {}; } };

    return {
        user,
        permissionManager
    };
};

const init: () => Promise<void> = async () => {

    await server.register([
        { plugin: Inert },
        { plugin: Vision },
        { plugin: HapiAuthJWT2 },
        {
            plugin: HapiSwagger,
            options: {
                info: {
                    title: "Test API Documentation",
                    description: "This is a sample example of API documentation."
                },
                securityDefinitions: {
                    jwt: {
                        type: "apiKey",
                        name: "Authorization",
                        in: "header"
                    }
                }
            }
        }
    ]);

    server.auth.strategy("jwt", "jwt", {
        key: "test-key",
        validate: (decoded: object, request: Hapi.Request) => {
            console.log(decoded, request.payload);

            const getPlayerFromDB = (): object => ({ id: 1, name: "test name 123" });

            // request.permissionManager = { can () { return true; }, accessible() { return {}; } };

            return { isValid: true };
        },
        verifyOptions: { algorithms: [ "HS512" ] }
    });

    server.auth.default("jwt");

    server.route([
        {
            method: "GET",
            path: "/login",
            options: {
                handler: (req, h) => {
                    const token = jwt.sign({ id: 1, name: "test-user" }, "test-key", { algorithm: "HS512" });
                    return token;
                },
                description: "test route",
                notes: "test route",
                tags: ["api"],
                auth: false
            }
        },
        {
            method: "GET",
            path: "/",
            options: {
                handler: (req, h) => {
                    return "1337 test";
                },
                description: "test route",
                notes: "test route",
                tags: ["api"],
                auth: false
            }
        },
        {
            method: "GET",
            path: "/test/{guid}",
            handler: async (req, h) => {
                const ctx = await getContext(req);

                console.log("context:", ctx);

                console.log("auth:", req.auth);

                throw new Error("test error");

                // return "test 1337";
            },
            options: {
                description: "test route",
                notes: "test route 1337",
                tags: ["api"],
                validate: {
                    params: {
                        guid: Joi.number().required().description("test guid")
                    }
                }
            }
        }
    ]);

    server.ext("onPreResponse", (request: Hapi.Request, h: Hapi.ResponseToolkit, err?: Error): Hapi.Lifecycle.ReturnValue => {
        const response = request.response;

        if (!(response instanceof Boom)) {
            return h.continue;
        }

        console.log("response is Boom error:", response);

        // const error = response;

        return response;
    });

    await server.start();

    console.log(`Server started at: ${server.info.uri}`);
};

init();

import { auth } from "@/server/auth";

const handler = (req: Request) => auth.handler(req);

export { handler as GET, handler as POST, handler as OPTIONS };

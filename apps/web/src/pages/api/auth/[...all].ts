import { auth } from "@my-better-t-app/auth";
import type { APIRoute } from "astro";

export const prerender = false;

export const ALL: APIRoute = ({ request }) => auth.handler(request);

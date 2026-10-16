// @ts-check
import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import mermaid from "astro-mermaid";
import starlightLinksValidator from "starlight-links-validator";
import starlightSidebarTopics from "starlight-sidebar-topics";
import pluginCut from "./plugins/expressive-code-cut.mjs";
import { topics } from "./sidebar.mjs";

// The documentation site, served from GitHub Pages at https://dyhex.github.io/POMWright/. Every link within it is
// root-absolute with the base (/POMWright/...), which starlight-links-validator checks, anchors included, at build time.
export default defineConfig({
	site: "https://dyhex.github.io",
	base: "/POMWright",
	integrations: [
		mermaid({ autoTheme: true }),
		starlight({
			title: "POMWright",
			description: "Page objects and locator chains for Playwright.",
			social: [{ icon: "github", label: "GitHub", href: "https://github.com/DyHex/POMWright" }],
			editLink: { baseUrl: "https://github.com/DyHex/POMWright/edit/main/website/" },
			components: {
				SiteTitle: "./src/components/SiteTitle.astro",
				// pre-release: remove before the merge to main, with the component and the head entry below
				Banner: "./src/components/Banner.astro",
			},
			// pre-release: keeps search engines from listing the docs of a version npm does not serve yet
			head: [{ tag: "meta", attrs: { name: "robots", content: "noindex" } }],
			customCss: ["./src/styles/custom.css"],
			expressiveCode: { plugins: [pluginCut()] },
			plugins: [starlightSidebarTopics(topics), starlightLinksValidator()],
		}),
	],
});

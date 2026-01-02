"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Home;
var clsx_1 = require("clsx");
var Link_1 = require("@docusaurus/Link");
var useDocusaurusContext_1 = require("@docusaurus/useDocusaurusContext");
var Layout_1 = require("@theme/Layout");
var Heading_1 = require("@theme/Heading");
var index_module_css_1 = require("./index.module.css");
function HomepageHeader() {
    var siteConfig = (0, useDocusaurusContext_1.default)().siteConfig;
    return (<header className={(0, clsx_1.default)('hero hero--primary', index_module_css_1.default.heroBanner)}>
      <div className="container">
        <img src={"".concat(siteConfig.baseUrl, "/img/forge-logo.png")} alt="Site Logo" style={{ display: 'block', margin: '0 auto 1rem', maxWidth: 160 }}/>
        <Heading_1.default as="h1" className="hero__title">
          {siteConfig.title}
        </Heading_1.default>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={index_module_css_1.default.buttons}>
          <Link_1.default className="button button--primary button--lg" to="/docs/intro">
            Get Started! 🔥
          </Link_1.default>
          <Link_1.default className="button button--secondary button--lg" to="/docs/category/documentation">
            Documentation
          </Link_1.default>
        </div>
      </div>
    </header>);
}
function Home() {
    var siteConfig = (0, useDocusaurusContext_1.default)().siteConfig;
    return (<Layout_1.default title={siteConfig.title} description="Forge is a browser-based, code only game engine. It has everything you would expect from an engine, including rendering, audio, input, animations, ECS, etc.">
      <HomepageHeader />
    </Layout_1.default>);
}

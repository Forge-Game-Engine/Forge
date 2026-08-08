---
name: create-design-document
description: Use this skill when designing or planning for a new feature or major change to the engine.
---

# Design a feature

The `design` folder holds design documents and specifications for new features, major re-writes and refactors to the engine.
Consult the `AGENTS.md` for information on how the engine is structured and works before starting planning.

## 1. Document Structure

Every design document should be a markdown file in the `design` folder. The file name should be descriptive of the feature being designed, and should be in kebab-case (e.g. `new-feature.md`).

In the document, include the following sections:

- Name: A short, descriptive name for the feature, re-write or refactor.
- A table that lists: 
  - the targeted modules, indicating which are new, which are being modified, and which are being removed.
  - Engine version at time of design
- Summary: A brief summary of the feature, re-write or refactor, that briefly includes its purpose and goals.
- Scope
  - In scope: A list of the specific features, modules, or components that will be included in the design.
  - Out of scope: A list of the specific features, modules, or components that will not be in the design, that one may assume would be included, but are not.
- Phases: A list of the phases of the design, including a brief description of each phase and its goals, a table of task that need to be implemented in each phase. Each task should have a name, a description, and a T-shit size estimate (S, M, L, XL). Phases should be pieces of work that need to happen in order to complete the design, and should be ordered in a logical sequence. Each phase should have a clear definition of done, and should be able to be completed and released independently of other phases.
- A decision log: A list of the major decisions made during the design process, including the possible options, the decision (which option was chosen), and the rationale behind it, the tradeoff and assumptions made.
- A list of open questions: A list of the open questions that need to be answered in order to complete the design, including the question, the possible options, and the rationale behind each option. The list should be ordered by priority, with the most important questions at the top.
- Design sub-sections: An arbitrary number of sections that describe major parts of the design, include anything that is relevant to the design, including but not limited to: 
  - API design
  - Data structures
  - Algorithms
  - Performance considerations
  - Security considerations
  - User experience considerations
  - Accessibility considerations
  - Internationalization considerations
  - Testing considerations
  - Documentation considerations
  - Entity composition and relationships
  - Mermaid diagrams
  - Pseudocode
  - Toolchains and pipelines

## 2. Design considerations

When constructing a design document. Never assume that the business wants a "quick fix" or "hack" to a problem. Just because something might "take a lot of work", or will be a "big change" does not mean it is not the right solution. The design document should be a complete and thorough exploration of the problem space, and should consider all possible solutions, even if they are not the most obvious or easiest to implement.

Forge is it's own unique product, do not use wording, or text that are common place in a competitor's product. The design document should be written in a way that is clear and concise, and should avoid using jargon or buzzwords that are not relevant to the design.

If there is any uncertainty or ambiguity during the design phase as to the direction of the product of the intention of the feature, as the user. 
import type { ProcessStep } from "@/types/content";

export const processFixture: ProcessStep[] = [
  {
    index: "01",
    title: "Discover",
    summary: "We learn how your organisation works today, who the software serves and what success looks like in plain terms.",
    deliverables: ["Stakeholder interviews", "Workflow and pain point map", "Constraints covering budget, timeline and compliance"],
    expectation: "Expect direct questions and honest feedback on feasibility before any commitment.",
  },
  {
    index: "02",
    title: "Scope",
    summary: "The problem is narrowed to a first release that is genuinely useful, with explicit boundaries and a written proposal.",
    deliverables: ["Prioritised scope and out of scope list", "Written proposal with versioned estimates", "Delivery plan and milestones"],
    expectation: "Estimates are ranges with assumptions, not a single magic number.",
  },
  {
    index: "03",
    title: "Design",
    summary: "Flows, information architecture and interface design are validated with the people who will use the product.",
    deliverables: ["Flows and wireframes", "Interactive prototype", "Design system tokens and components"],
    expectation: "Design reviews happen on real devices, including small and low end phones.",
  },
  {
    index: "04",
    title: "Architect",
    summary: "Data model, permissions, integrations and hosting are decided and documented before heavy build begins.",
    deliverables: ["Data and permission model", "Integration contracts", "Hosting, environments and cost plan"],
    expectation: "You see the architecture decisions and their trade offs in writing.",
  },
  {
    index: "05",
    title: "Build",
    summary: "Work ships in vertical slices that work end to end, so you can test real functionality every week or two.",
    deliverables: ["Working increments on a staging environment", "Progress notes against milestones", "Running demo at each checkpoint"],
    expectation: "No long silent build phases. Progress is visible and testable.",
  },
  {
    index: "06",
    title: "Assure",
    summary: "Quality, security and accessibility are checked deliberately, not assumed.",
    deliverables: ["Automated tests and manual QA matrix", "Security and permissions review", "Performance and accessibility checks"],
    expectation: "Known issues are listed with severity before launch, not discovered afterwards.",
  },
  {
    index: "07",
    title: "Launch",
    summary: "Deployment, data migration where needed, training and a monitored go live.",
    deliverables: ["Production deployment and rollback plan", "Training sessions and guides", "Monitoring and alerting configured"],
    expectation: "A calm launch with a clear owner on both sides.",
  },
  {
    index: "08",
    title: "Maintain",
    summary: "Ongoing updates, support and improvements with defined response expectations.",
    deliverables: ["Maintenance agreement", "Scheduled dependency and security updates", "Improvement backlog and reviews"],
    expectation: "Response expectations are written down and measured.",
  },
];

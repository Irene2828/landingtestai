import type { MockResults } from "./types";

export const mockResults: MockResults = {
  keyStrengths: [
    "The page establishes a clear product category quickly: a visitor can tell this is a SaaS tool for turning customer conversations into usable insight within the first screen.",
    "The visual system is disciplined. The layout uses one dominant message column, one product preview, and enough whitespace that the page feels credible rather than crowded.",
    "The core promise is mostly outcome-led. Phrases like \"turn customer calls into searchable insight\" are stronger than feature-led copy and give the page a solid strategic direction."
  ],
  keyGaps: [
    "The hero is trying to sell too many benefits at once: interview synthesis, research speed, and GTM alignment all appear before one main promise is fully established.",
    "The CTA language is generic, so the visitor still has to infer the next step and level of commitment.",
    "The social proof section signals credibility, but it does not yet provide enough specificity to justify the product claims for a skeptical SaaS buyer."
  ],
  topActions: [
    "Rewrite the hero around one job-to-be-done, then demote secondary benefits into supporting copy instead of asking the headline to carry everything.",
    "Replace the primary CTA with the actual next step, such as \"Book a 15-minute demo\" or \"Upload a sample call,\" and add one friction-reducing line beneath it.",
    "Upgrade social proof from generic validation to measurable proof by pairing logos with a role-based quote and a concrete outcome."
  ],
  sections: [
    {
      key: "Hero",
      title: "Hero Message Clarity",
      summary:
        "The hero has a credible core idea, but it is split across too many promises for a first impression.",
      screenshotLabel: "Hero section preview",
      observation:
        "The strongest line in the hero is the headline example, \"Turn customer calls into searchable product insight,\" because it names a clear input and a clear output. The problem is that the supporting copy immediately adds two more ideas, such as replacing manual synthesis and accelerating GTM decisions, so the hero starts to feel like three headlines stacked together.",
      evidence:
        "Text: the headline is focused, but the subheadline introduces multiple benefit layers before the visitor has anchored on the main value proposition. Structure: the product screenshot is nearly equal in visual weight to the copy block, so the eye bounces between interface detail and the main message. Visual hierarchy: the trust cue sits low enough that it reads as secondary, even though it should help validate the headline.",
      recommendation:
        "Keep the hero centered on one promise and make the rest support it. Example direction: headline \"Turn customer calls into searchable product insight\" with subcopy \"Auto-tag themes, objections, and quotes after every interview.\" Then move the broader business payoff into a short proof sentence near the CTA instead of asking the hero to explain everything at once.",
      confidence: {
        level: "High",
        reason:
          "This is a first-screen copy and hierarchy issue, so it is visible without needing behavioral or conversion data."
      }
    },
    {
      key: "CTA",
      title: "Call to Action Strength",
      summary:
        "The CTA is easy to find, but it does not explain the next step clearly enough to convert intent into action.",
      screenshotLabel: "CTA block preview",
      observation:
        "The primary CTA example, \"Get Started,\" is too generic for a B2B SaaS page that appears to sell a consultative workflow. It asks for commitment without telling the visitor whether they are starting a free trial, booking a demo, or testing the product with their own data.",
      evidence:
        "Text: the button label is action-oriented but non-specific. Structure: the primary button sits close to a secondary action of similar importance, which weakens the sense of one preferred path. Visual hierarchy: there is no microcopy under the CTA to reduce friction around setup time, pricing commitment, or what happens immediately after the click.",
      recommendation:
        "Rename the CTA to the actual next step. If the sales motion is demo-led, use something like \"Book a 15-minute walkthrough.\" If the product supports self-serve evaluation, use \"Upload a sample call.\" Add one short qualifier directly below it, such as \"See tagged themes from one recording in under 5 minutes\" or \"No credit card required,\" and visually demote the secondary action so the primary path is unmistakable.",
      confidence: {
        level: "High",
        reason:
          "The weakness is explicit in the button language and surrounding structure, and those are strong predictors of CTA clarity even before testing."
      }
    },
    {
      key: "Social Proof",
      title: "Trust and Proof Signals",
      summary:
        "The proof section signals legitimacy, but it does not yet give a serious buyer enough evidence to believe the promised outcome.",
      screenshotLabel: "Social proof preview",
      observation:
        "The section likely includes the right ingredients, such as logos and a testimonial, but the testimonial example reads more like praise than proof. A line like \"This changed how we learn from customers\" sounds positive, yet it does not tell the reader what changed, for whom, or by how much.",
      evidence:
        "Text: the quote language is broad and non-measurable. Structure: logos and testimonial content appear as separate credibility signals rather than a single proof story. Visual hierarchy: the customer source is comparatively easy to miss, which lowers trust because the visitor has to work to identify who is making the claim. For SaaS buyers, unnamed praise carries far less weight than role-specific outcomes.",
      recommendation:
        "Replace one generic quote with a role-based, quantified proof block. Example direction: \"We cut interview synthesis from 6 hours to 45 minutes a week\" paired with a title such as Head of Product or VP of Research. Keep the logo strip tight, then place the quantified quote directly beneath it so the visitor reads credibility and outcome as one connected argument.",
      confidence: {
        level: "High",
        reason:
          "Trust quality in SaaS landing pages depends heavily on specificity, and the current mock proof is visibly too broad to carry the claim on its own."
      }
    }
  ]
};

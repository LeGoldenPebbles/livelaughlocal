# Live Laugh Local

UK local-events magazine - markets, fairs, food events and days out. Editorial
grounded in live event listings, reader submissions with a paid Featured tier,
and an ad system that starts 100% house-inventory.

- **Spec:** [PLAN.md](PLAN.md) (architecture, ads, cookies, generator, launch phases)
- **Working agreements / cross-repo context:** [CLAUDE.md](CLAUDE.md)
- **Stack:** Next.js 15 (App Router, JS), Tailwind 3, MongoDB (Mongoose), Stripe, R2

```bash
npm install
cp .env.example .env.local   # fill in
npm run dev                  # localhost:3005
npm run build
npm run seed                 # seed drafts; add --publish to go straight live
```

Part of Spaces Please Ltd.

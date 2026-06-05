---
title: "Jailbreaking the Meta Portal Plus 2026"
description: "now you're thinking with portals"
date: "2026-06-05T06:58:27.061Z"
---

I have this crazy idea and I really, really want to try it. Basically Meta recently allowed for ADB to be used for the Meta Portal series, which they discontinued in 2024 or so. It's been end of life for like two years.

Because ADB has been enabled, I wonder if there are unpatched kernels for the meta portal that can be downgraded so that you can use one of the many Linux exploits that have been recently used on them.

I'm going to use this document as my log for it for now but I think that it will be very, very interesting to actively work on this exploit chain.

# TLDR: Meet GladOS

GladOS is an interface replacement for the default experience of the Meta Portal. The goal was to add the Anomalous SDK and anomalous agent builder system into an android system.

the app itself will be an Expo application.

## Getting ADB on the portal.

Meta has some resources available for users that can be added into the system:\
\
heres the blog post: <https://developers.meta.com/horizon/blog/build-apps-for-portal-with-ai/>\
\
heres the skills: <https://github.com/meta-quest/agentic-tools/tree/main/skills/portal>

For ADB on these you just use the standard ADB processing.

## Reference List

<https://developers.meta.com/horizon/blog/build-apps-for-portal-with-ai/>
---
title: "duckdb is (un)reasonably effective for agent orchestration"
description: ""
date: "2026-06-18"
tags: [duckdb, waddling, anomalous, devlog]
---

# Introduction

With the recent release of the quack protocol ([https://duckdb.org/2026/05/12/quack-remote-protocol](https://duckdb.org/2026/05/12/quack-remote-protocol)) by the DuckDB team I've been spending a LOT of time working on using it to improve my own workflows. 

Something that I've found with quack is that i'm tending to reach for Duck in contexts where I don't know if I'll need to analyze the work that  is being done in that app remotely. This has been a really great outcome for me because I can get most of the things that I would need from my remote apps through a quack link without the need to ship the whole db file over. 

Because of the fun I've been having I thought "what if I could just use duckdb for everything that my harnesses do?" and so I started working on Waddling ([https://getwaddling.com](https://getwaddling.com)) .

# Duck Syndrome for Small Teams

Given all of the fanfare around leveraging LLMs for doing a bunch more work that one person used to be able to do, I've run into the issue of not knowing nearly enough to leverage those things in the first place.

# Managing Traces when you don't know what to Optimize for

> Note (DATE): I've written up a blog post about how I manage building MCP optimizations in Anomalous here (link to other blog, you can check it )

Ducklake ([https://ducklake.select/](https://ducklake.select/) ) is a great data lake program that effectively leverages the strength of the separation of storage and compute for data Lakes while using off-the-shelf databases for metadata management. Because of this its really really easy to spin up a new data lake or melt an Iceberg deployment into something a bit more manageable. But something that it doesn't have access to 

# the little guy's quack-BAC

- heres where i want to talk about the building of Birdshot, duckdb quack-based access controls. I don't want to make this too long, so ill link to my other blog post on birdshot and how I came to build access controls at the DB level.

# Where I use it the most: Exactly where I use Duck the Most

- i have an ai company called Anomalous. Our goal is to make LLMs actually useful for more than one-offs, or technical teams. 
- we use Waddling to manage Waddling
  - 
- we use Waddling to manage Shared Agent sessions
  - because everything is inter-quack-connected we are able to really effectively leverage shared inter-agent information without the need to deal with things like file locking, memory overwrites, and all the messy parts of working with multiplayer documents.
- Since all of our agents and almost all of our sessions are running in the same places, we are able to streamline our whole ETL process, sometimes in realtime. See my Benchmarks

# Waddling away from the Cloud to the Local Side of the Pond

- all of this is great but it has also meant that we can do some pretty funky things for example in-network analysis of apps


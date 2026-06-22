---
title: "Volcanic Ducks: Building Edge Analytics for my Obsidian Notebook that can actually be Useful"
description: "Or rather, how I connected my Obsidian vaults with my own data lake beyond just having an agent running inside the notebooks themselves "
date: "2026-06-21"
tags: [waddling, duckdb, harness engineering]
---

I've been really liking building DuckDB extensions for myself, and in fact, I started Waddling because of how much fun I've been having doing so.

Because of that, I figured I really like Obsidian, but I don't like having to build integrations for Obsidian. I have a Waddling system that is quite good at building effective ETL and ELT pipelines and general data connectivity. I figured, what the hell, let me build a duckDB extension for doing autonomous analytics on my Obsidian notes just through Waddling. 

# The Idea

The idea here is that because of Waddling's networked, edge-based analytics, I can actually have most of my important and reasonable report generation happen on my computer long before it actually enters my memory lake.

This means that, for all intents and purposes, I am able to very effectively build local software that is connective, queryable, and reasonable for my own larger data systems, just on my own Obsidian notes.

# How I Actually Use This

At Waddling, we have a \[blog post\] (link here!! write this before you publish) explaining more about how we build peer-to-peer DuckDB systems, but here is a quick summary.

In Waddling, every database, whether it is on a remote system or it is on a local system, is keyed with its own public key over iroh. Because of this, we can actually use each of these systems along with our birdshot system to be able to very accurately and significantly build access control lists for local systems, catch-all, as well as remote systems that allow us to extract data where the ELT has already happened.  Using this and deploying code at the edge allows us to really, really fine tune how we are viewing ourselves and the code that we ship, as well as the data that we end up ingesting into our end data lake. This means that we don't actually have to think too much about doing post-processing on our data. We just need to ingest it and then re-configure it into how our end databases, services, and products work. 

This is actually how we manage **all** of our pipelines internally. 

Because of that, and because of the trigger system that we've included in our pipeline API, I'm able to very easily and very regularly ping my own servers about what they're doing and about how they work. 

But the thing is, in the end, I don't actually want to do analytics on the raw data as much as I want to be able to have some deeper understanding about how my ingest system works. I want to be able to keep my notes effective in an interface that I like. I also want to be able to leverage a lot of that data into being able to build recommender systems for myself, or being able to actually surface insights and new deep dives that are not otherwise accessible to me. 

# Building The Plugin

- i need to include an actual github url that manages this
- 


# Module 6 — AI phone ordering

## Goal
Answer restaurant calls, take structured orders, and safely hand them to staff.

## Implement
- Telephony provider adapter (Twilio or approved alternative) with inbound webhook verification.
- Call session, transcript, extracted cart, consent, recording metadata, and escalation state.
- Restaurant-hours/menu/availability-aware conversational flow.
- Read-back confirmation for items, modifiers, address, fulfilment time, and total.
- Human handoff for allergies, uncertainty, complaints, refunds, large orders, or low confidence.
- Payment-link delivery rather than collecting raw card data by voice.
- Confirmed orders enter the same online-order acceptance/KDS/inventory pipeline.
- Call analytics: conversion, abandonment, escalation, average duration, correction rate.

## Acceptance
The agent never invents menu items/prices; required modifiers are confirmed; uncertain orders escalate; webhooks are verified; recordings follow configured consent/retention; orders are submitted once.

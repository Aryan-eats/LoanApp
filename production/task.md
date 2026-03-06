1. Product Overview

The new MVP of GPS India is a Partner Dashboard Platform designed for loan agents, DSAs, and financial consultants to manage their entire loan pipeline.

Instead of acting only as a loan lead generator, the platform becomes a daily work tool for agents.

The system allows partners to:

Manage all their clients in one place

Store and organize loan documents

Check loan eligibility & required docs across multiple banks/NBFCs

Use financial calculators for quick client advisory

Prepare loan files correctly and avoid trash leads

Submit selected cases to GPS India for processing

This approach ensures partners use the platform daily, increasing engagement and eventual loan submissions.

2. Core MVP Components

The MVP should consist of five core modules.

1. Partner Dashboard

The Partner Dashboard is the central interface where agents manage their operations.

Main dashboard information:

• Total clients
• Active loan cases
• Documents pending
• Cases submitted to GPS
• Recent activity

Example dashboard widgets:

1 .Clients added this month

2. Active loan pipeline :
	Purpose: Understand the status of all cases.
	Widget Data:

	Total active clients
	Cases in each stage
	Lead Received
	Docs Pending
	File Preparation
	Submitted
	Approved
	Disbursed

3. Pending documents : Purpose: Identify cases that cannot move forward.

Widget Data:

Client	      Missing Document	Days Pending
Rahul Sharma	Salary Slip	3
Neha Gupta	Bank Statement	1

Why it matters

Document delays are the biggest bottleneck in lending

Reduces turnaround time

Priority Level: Critical operational widget.

4. Recent client activity: Purpose: Quick activity feed.

Example

• Rahul uploaded bank statement
• ICICI approved loan for Neha
• Amit’s case moved to submission stage

Why it matters

Helps partners track updates without opening each client file.

5. monthly disbursal tracker:Purpose: Track partner revenue performance.

Example:

Metric	Value
Loans Disbursed	₹45L
Submitted Cases	12
Approval Rate	66%

Why it matters

Agents care about money first.

This widget helps them measure:

Monthly earnings

Business growth

6. Case Conversion Analytics: Purpose: Show partner efficiency.

Example:

Metric	Value
Leads Added	35
Submitted	15
Approved	10
Disbursed	8

Conversion Funnel

Lead → Submission → Approval → Disbursal

Why it matters

Helps partners understand:

where deals are lost

which stage needs improvement

7 .Follow-Up Reminders

8. Quick Tools Panel

Purpose: Fast access to calculators.

Buttons for:

EMI calculator

Balance transfer calculator

Eligibility checklist

Lender comparison

This dashboard acts as a control center for the partner's business.

2. Client Management System (Core Feature)

This is the most important feature of the MVP.

Partners can store and manage all their clients.

Client data fields include:

Personal Information

Full name

Phone number

Email

City

Financial Information

Employment type

Monthly income

Existing EMIs

CIBIL score (optional entry)

Loan Requirement

Loan type

Loan amount

Tenure

Purpose

Partners can also add notes about each client.

Client Pipeline Status

Each client should have a case stage:

Lead received

Documents pending

File preparation

Bank selection

Submitted

Approved

Disbursed

This creates a loan pipeline tracker.

3. Document Vault

Each client should have a secure document storage system.

Partners can upload and organize documents such as:

PAN card

Aadhaar card

Salary slips

Bank statements

Income tax returns

Property papers (for secured loans)

Documents should be:

• Stored securely
• Tagged by document type
• Linked to the specific client

This replaces the typical WhatsApp document chaos that agents currently deal with.

4. Lender Criteria Library

This feature provides a database of eligibility criteria from banks and NBFCs.

Partners can quickly check which lenders fit a client's profile.

Example information stored:

Lender Profile

Bank / NBFC name

Loan types offered

Interest rate range

Processing fees

Turnaround time

Eligibility Criteria

Minimum income

Minimum CIBIL score

FOIR limits

Employment category

Maximum loan amount

Partners can compare lenders quickly before submitting cases.

5. Loan Calculators

The MVP should include a few basic financial calculators that agents use regularly.

EMI Calculator

Inputs:

Loan amount

Interest rate

Tenure

Output:

Monthly EMI

Total interest

Total repayment

2. Balance Transfer Calculator

Inputs:

Current loan balance

Current interest rate

New interest rate

Remaining tenure

Output:

Potential EMI reduction

Total savings

These calculators help agents advise clients during conversations.

6. Case Submission to GPS India

Partners have the option to submit selected cases to GPS India.

Submission flow:

Partner adds a client file 

Selects lender option ( manual input if not in my DB )

Uploads documents, manages actions.

Clicks a button in LeadStrip to Submit to GPS

The system then:

Sends case to admin dashboard

Creates a new lead entry

Allows GPS team to process the file

This ensures GPS still captures loan commission revenue.

7. Admin Dashboard (Basic)

The admin panel is used by the GPS team to manage the platform.

Key admin functions:

Partner Management

Approve partners

View partner activity??

Track submissions

Case Management

View all submitted loan cases

Assign lenders

Update case status

Lender Management

Add/edit lender criteria

Update loan products

Document Monitoring

View uploaded files for verification

8. Authentication System

Three types of users will exist in the MVP:

Admin

Internal GPS team.

Partner

Loan agents using the platform.

Customer

Clients who may upload documents or track case status.

*a tracking link is generated for the customer when the loan status is "bank processing" which shows the timeline updates from admin or partner or any updates or queries from admin/partner*

9. Technology Stack (Your Current Plan)

Your selected stack works well for this product.

Frontend
React + TypeScript

Backend
Node.js + express

Docker

Database
PostgreSQL
Cache
Redis

File Storage
cloudfare r2
PostgreSQL for metadeta

Changes required in this architecture to handling 10k partners?
1. Document Upload Optimization

Use pre-signed upload URLs.

Flow:

Frontend → request upload URL
Backend → generates R2 signed URL
Frontend → uploads directly to R2
Backend → saves metadata

This avoids backend bandwidth usage.

2. PostgreSQL Scaling Strategy

Your biggest bottleneck will be database queries.

Key changes:

Proper Indexing


10. next phase for MVP Should Include:

To launch faster, avoid building these initially:

 AI document review
 Automated eligibility engine
 Advanced analytics
 Customer mobile app
 Bank API integrations

These should come after traction.

11. MVP Success Metrics

The MVP should aim to validate three key assumptions:

Partner Adoption

Target:

50–100 active partners.

Platform Usage

Key metric:

Daily active partners using dashboard.

Loan Submissions

Target:

Reliable operation adoption and consistent loan submissions from partners through the platform.

Final MVP Summary

The GPS India MVP is a Partner-Focused Loan Management Platform that allows DSAs and financial agents to:

• Manage their clients
• Organize documents
• Check lender criteria
• Use financial calculators
• Submit loan cases through GPS India

The product's goal is to become an essential operating tool for loan agents, creating a scalable network that drives loan distribution.
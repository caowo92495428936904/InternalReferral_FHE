# InternalReferral_FHE

A privacy-preserving internal employee referral system that leverages Fully Homomorphic Encryption (FHE) to enable anonymous, encrypted talent recommendations. This platform allows employees to refer candidates securely while HR can view aggregated, encrypted matches without ever exposing identities or personal data.

## Project Background

Internal referral programs are vital for talent acquisition, but they face multiple challenges:

- **Privacy concerns**: Employees may hesitate to refer colleagues if identities are exposed.  
- **Sensitive candidate data**: Sharing personal information can breach confidentiality and trust.  
- **Bias and manipulation risks**: Centralized HR systems may inadvertently expose referral sources.  
- **Limited reach**: Traditional referral programs do not scale effectively across large organizations.

InternalReferral_FHE addresses these issues by using FHE to compute matches between candidates and job openings on encrypted referral data. This ensures anonymity and preserves the privacy of both referrers and candidates while enabling secure, trustworthy HR operations.

## Features

### Core Functionality

- **Encrypted Referral Submission**: Employees submit referrals securely in encrypted form.  
- **FHE-Powered Job Matching**: Candidate skills and profiles are matched to open positions without decrypting data.  
- **Anonymous Candidate Dashboard**: HR views aggregated candidate matches without seeing personal details.  
- **Real-Time Match Updates**: New referrals are incorporated automatically while preserving privacy.  
- **Team Collaboration**: Multiple HR staff can review results without compromising confidentiality.

### Privacy & Anonymity

- **Client-Side Encryption**: All referral and candidate data is encrypted before leaving the user’s device.  
- **Full Homomorphic Computation**: Matches and analytics are computed directly on encrypted data.  
- **Immutable Records**: Referral submissions are securely logged and cannot be altered.  
- **Identity Protection**: The system ensures that both referrer and candidate identities remain confidential.

## Architecture

### Backend

- **FHE Matching Engine**: Computes job-candidate compatibility entirely on encrypted data.  
- **Secure Data Storage**: Encrypted candidate profiles and referral data are stored safely.  
- **API Layer**: Provides aggregate match results to the frontend without exposing raw data.

### Frontend Application

- **Interactive Dashboard**: Employees submit referrals and HR staff review aggregated matches.  
- **Visualization Tools**: Aggregate match statistics and trends are displayed securely.  
- **Encrypted Communication**: Ensures end-to-end data privacy during submission and analysis.  
- **Multi-User Access**: Supports multiple HR users without revealing sensitive data.

## Technology Stack

### Backend

- Python + FHE Libraries: Handles encrypted computation and match processing.  
- PostgreSQL / Encrypted Storage: Secure repository for referral and candidate data.  
- FastAPI: Serves encrypted endpoints for frontend access.

### Frontend

- React 18 + TypeScript: Modern and responsive user interface.  
- Tailwind CSS: Styling and layout for an intuitive experience.  
- Charts & Analytics: Display secure insights while maintaining anonymity.

## Installation

### Prerequisites

- Node.js 18+  
- Python 3.10+  
- npm / yarn / pnpm package manager  

### Setup

1. Clone the repository.  
2. Install frontend dependencies: `npm install` or `yarn install`.  
3. Install backend dependencies: `pip install -r requirements.txt`.  
4. Configure environment variables for secure storage and API endpoints.  
5. Start backend: `python main.py`.  
6. Start frontend: `npm start` or `yarn start`.

## Usage

- **Submit Referrals**: Employees submit encrypted candidate referrals.  
- **Match Candidates to Roles**: FHE-powered computation generates secure matches.  
- **Review Aggregated Insights**: HR staff view match statistics without seeing personal details.  
- **Collaborate Safely**: Multiple HR users can work with encrypted data simultaneously.

## Security Features

- **End-to-End Encryption**: All referral and candidate data remains encrypted.  
- **Homomorphic Computation**: Allows secure processing without decrypting sensitive information.  
- **Immutable Submission Logs**: Referrals and analyses are recorded tamper-proof.  
- **Anonymity by Design**: No direct identifiers for referrers or candidates are revealed.

## Future Enhancements

- **Expanded Role Matching Algorithms**: Support for advanced skill-based matching.  
- **Real-Time Notifications**: Alert HR when high-potential candidates are referred.  
- **Enterprise Integration**: Connect encrypted referral system with HR management platforms.  
- **Multi-Language Support**: Enable referrals and candidate processing in multiple languages.  
- **Predictive Analytics**: FHE-powered insights for potential hiring outcomes and workforce planning.

InternalReferral_FHE enables organizations to scale internal referrals securely, empowering employees to participate in talent acquisition while preserving the privacy of all parties involved.

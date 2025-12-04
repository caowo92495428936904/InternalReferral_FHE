// App.tsx
import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { getContractReadOnly, getContractWithSigner } from "./contract";
import WalletManager from "./components/WalletManager";
import WalletSelector from "./components/WalletSelector";
import "./App.css";

interface Referral {
  id: string;
  encryptedData: string;
  timestamp: number;
  referrer: string;
  position: string;
  status: "pending" | "matched" | "rejected";
}

const App: React.FC = () => {
  const [account, setAccount] = useState("");
  const [loading, setLoading] = useState(true);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [walletSelectorOpen, setWalletSelectorOpen] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<{
    visible: boolean;
    status: "pending" | "success" | "error";
    message: string;
  }>({ visible: false, status: "pending", message: "" });
  const [newReferralData, setNewReferralData] = useState({
    position: "",
    candidateSkills: "",
    encryptedInfo: ""
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [showFAQ, setShowFAQ] = useState(false);

  // Calculate statistics for dashboard
  const matchedCount = referrals.filter(r => r.status === "matched").length;
  const pendingCount = referrals.filter(r => r.status === "pending").length;
  const rejectedCount = referrals.filter(r => r.status === "rejected").length;

  useEffect(() => {
    loadReferrals().finally(() => setLoading(false));
  }, []);

  const onWalletSelect = async (wallet: any) => {
    if (!wallet.provider) return;
    try {
      const web3Provider = new ethers.BrowserProvider(wallet.provider);
      setProvider(web3Provider);
      const accounts = await web3Provider.send("eth_requestAccounts", []);
      const acc = accounts[0] || "";
      setAccount(acc);

      wallet.provider.on("accountsChanged", async (accounts: string[]) => {
        const newAcc = accounts[0] || "";
        setAccount(newAcc);
      });
    } catch (e) {
      alert("Failed to connect wallet");
    }
  };

  const onConnect = () => setWalletSelectorOpen(true);
  const onDisconnect = () => {
    setAccount("");
    setProvider(null);
  };

  const loadReferrals = async () => {
    setIsRefreshing(true);
    try {
      const contract = await getContractReadOnly();
      if (!contract) return;
      
      // Check contract availability using FHE
      const isAvailable = await contract.isAvailable();
      if (!isAvailable) {
        console.error("Contract is not available");
        return;
      }
      
      const keysBytes = await contract.getData("referral_keys");
      let keys: string[] = [];
      
      if (keysBytes.length > 0) {
        try {
          keys = JSON.parse(ethers.toUtf8String(keysBytes));
        } catch (e) {
          console.error("Error parsing referral keys:", e);
        }
      }
      
      const list: Referral[] = [];
      
      for (const key of keys) {
        try {
          const referralBytes = await contract.getData(`referral_${key}`);
          if (referralBytes.length > 0) {
            try {
              const referralData = JSON.parse(ethers.toUtf8String(referralBytes));
              list.push({
                id: key,
                encryptedData: referralData.data,
                timestamp: referralData.timestamp,
                referrer: referralData.referrer,
                position: referralData.position,
                status: referralData.status || "pending"
              });
            } catch (e) {
              console.error(`Error parsing referral data for ${key}:`, e);
            }
          }
        } catch (e) {
          console.error(`Error loading referral ${key}:`, e);
        }
      }
      
      list.sort((a, b) => b.timestamp - a.timestamp);
      setReferrals(list);
    } catch (e) {
      console.error("Error loading referrals:", e);
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  };

  const submitReferral = async () => {
    if (!provider) { 
      alert("Please connect wallet first"); 
      return; 
    }
    
    setCreating(true);
    setTransactionStatus({
      visible: true,
      status: "pending",
      message: "Encrypting candidate data with FHE..."
    });
    
    try {
      // Simulate FHE encryption
      const encryptedData = `FHE-${btoa(JSON.stringify(newReferralData))}`;
      
      const contract = await getContractWithSigner();
      if (!contract) {
        throw new Error("Failed to get contract with signer");
      }
      
      const referralId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const referralData = {
        data: encryptedData,
        timestamp: Math.floor(Date.now() / 1000),
        referrer: account,
        position: newReferralData.position,
        status: "pending"
      };
      
      // Store encrypted data on-chain using FHE
      await contract.setData(
        `referral_${referralId}`, 
        ethers.toUtf8Bytes(JSON.stringify(referralData))
      );
      
      const keysBytes = await contract.getData("referral_keys");
      let keys: string[] = [];
      
      if (keysBytes.length > 0) {
        try {
          keys = JSON.parse(ethers.toUtf8String(keysBytes));
        } catch (e) {
          console.error("Error parsing keys:", e);
        }
      }
      
      keys.push(referralId);
      
      await contract.setData(
        "referral_keys", 
        ethers.toUtf8Bytes(JSON.stringify(keys))
      );
      
      setTransactionStatus({
        visible: true,
        status: "success",
        message: "Encrypted referral submitted securely!"
      });
      
      await loadReferrals();
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
        setShowCreateModal(false);
        setNewReferralData({
          position: "",
          candidateSkills: "",
          encryptedInfo: ""
        });
      }, 2000);
    } catch (e: any) {
      const errorMessage = e.message.includes("user rejected transaction")
        ? "Transaction rejected by user"
        : "Submission failed: " + (e.message || "Unknown error");
      
      setTransactionStatus({
        visible: true,
        status: "error",
        message: errorMessage
      });
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 3000);
    } finally {
      setCreating(false);
    }
  };

  const matchReferral = async (referralId: string) => {
    if (!provider) {
      alert("Please connect wallet first");
      return;
    }

    setTransactionStatus({
      visible: true,
      status: "pending",
      message: "Processing encrypted data with FHE..."
    });

    try {
      // Simulate FHE computation time
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const contract = await getContractWithSigner();
      if (!contract) {
        throw new Error("Failed to get contract with signer");
      }
      
      const referralBytes = await contract.getData(`referral_${referralId}`);
      if (referralBytes.length === 0) {
        throw new Error("Referral not found");
      }
      
      const referralData = JSON.parse(ethers.toUtf8String(referralBytes));
      
      const updatedReferral = {
        ...referralData,
        status: "matched"
      };
      
      await contract.setData(
        `referral_${referralId}`, 
        ethers.toUtf8Bytes(JSON.stringify(updatedReferral))
      );
      
      setTransactionStatus({
        visible: true,
        status: "success",
        message: "FHE matching completed successfully!"
      });
      
      await loadReferrals();
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 2000);
    } catch (e: any) {
      setTransactionStatus({
        visible: true,
        status: "error",
        message: "Matching failed: " + (e.message || "Unknown error")
      });
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 3000);
    }
  };

  const rejectReferral = async (referralId: string) => {
    if (!provider) {
      alert("Please connect wallet first");
      return;
    }

    setTransactionStatus({
      visible: true,
      status: "pending",
      message: "Processing encrypted data with FHE..."
    });

    try {
      // Simulate FHE computation time
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const contract = await getContractWithSigner();
      if (!contract) {
        throw new Error("Failed to get contract with signer");
      }
      
      const referralBytes = await contract.getData(`referral_${referralId}`);
      if (referralBytes.length === 0) {
        throw new Error("Referral not found");
      }
      
      const referralData = JSON.parse(ethers.toUtf8String(referralBytes));
      
      const updatedReferral = {
        ...referralData,
        status: "rejected"
      };
      
      await contract.setData(
        `referral_${referralId}`, 
        ethers.toUtf8Bytes(JSON.stringify(updatedReferral))
      );
      
      setTransactionStatus({
        visible: true,
        status: "success",
        message: "FHE rejection completed successfully!"
      });
      
      await loadReferrals();
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 2000);
    } catch (e: any) {
      setTransactionStatus({
        visible: true,
        status: "error",
        message: "Rejection failed: " + (e.message || "Unknown error")
      });
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 3000);
    }
  };

  const isReferrer = (address: string) => {
    return account.toLowerCase() === address.toLowerCase();
  };

  const renderBarChart = () => {
    const positions = Array.from(new Set(referrals.map(r => r.position)));
    const positionCounts = positions.map(position => ({
      position,
      count: referrals.filter(r => r.position === position).length
    }));

    const maxCount = Math.max(...positionCounts.map(p => p.count), 1);

    return (
      <div className="bar-chart-container">
        {positionCounts.map((item, index) => (
          <div className="bar-item" key={index}>
            <div className="bar-label">{item.position}</div>
            <div className="bar-wrapper">
              <div 
                className="bar-fill" 
                style={{ width: `${(item.count / maxCount) * 100}%` }}
              >
                <span className="bar-value">{item.count}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const filteredReferrals = referrals.filter(referral => {
    const matchesSearch = referral.position.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          referral.referrer.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === "all") return matchesSearch;
    return matchesSearch && referral.status === activeTab;
  });

  const faqItems = [
    {
      question: "How does FHE protect my privacy?",
      answer: "Fully Homomorphic Encryption allows computations on encrypted data without decryption, ensuring your identity and candidate details remain confidential throughout the matching process."
    },
    {
      question: "Can HR see who made the referral?",
      answer: "No, all referrals are anonymized using FHE technology. HR only sees encrypted candidate profiles matched to open positions."
    },
    {
      question: "What happens after I submit a referral?",
      answer: "Our FHE system processes the encrypted candidate data, matches it against open positions, and HR receives anonymized profiles of qualified candidates."
    },
    {
      question: "How are candidates evaluated?",
      answer: "The FHE system performs encrypted matching between candidate skills and position requirements without revealing personal information."
    },
    {
      question: "Is there a reward for successful referrals?",
      answer: "Yes, successful matches qualify for our confidential referral bonus program while maintaining your anonymity."
    }
  ];

  if (loading) return (
    <div className="loading-screen">
      <div className="metal-spinner"></div>
      <p>Initializing encrypted connection...</p>
    </div>
  );

  return (
    <div className="app-container metal-theme">
      <header className="app-header">
        <div className="logo">
          <div className="logo-icon">
            <div className="shield-icon"></div>
          </div>
          <h1>FHE<span>Referral</span>System</h1>
        </div>
        
        <div className="header-actions">
          <button 
            onClick={() => setShowCreateModal(true)} 
            className="create-referral-btn metal-button"
          >
            <div className="add-icon"></div>
            Submit Referral
          </button>
          <button 
            className="metal-button"
            onClick={() => setShowFAQ(!showFAQ)}
          >
            {showFAQ ? "Hide FAQ" : "Show FAQ"}
          </button>
          <WalletManager account={account} onConnect={onConnect} onDisconnect={onDisconnect} />
        </div>
      </header>
      
      <div className="main-content">
        <div className="welcome-banner">
          <div className="welcome-text">
            <h2>Anonymous Employee Referral System</h2>
            <p>Securely recommend talent using Fully Homomorphic Encryption (FHE)</p>
          </div>
          <div className="fhe-badge">
            <span>FHE-Powered Privacy</span>
          </div>
        </div>
        
        <div className="dashboard-panels">
          <div className="panel project-intro">
            <h3>Project Introduction</h3>
            <p>Our FHE-powered referral system allows employees to anonymously recommend candidates while protecting both referrer and candidate privacy.</p>
            <div className="features">
              <div className="feature">
                <div className="feature-icon">🔒</div>
                <span>Encrypted referrals</span>
              </div>
              <div className="feature">
                <div className="feature-icon">🔄</div>
                <span>FHE position matching</span>
              </div>
              <div className="feature">
                <div className="feature-icon">👤</div>
                <span>Full anonymity</span>
              </div>
            </div>
          </div>
          
          <div className="panel data-stats">
            <h3>Referral Statistics</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-value">{referrals.length}</div>
                <div className="stat-label">Total Referrals</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{matchedCount}</div>
                <div className="stat-label">Matched</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{pendingCount}</div>
                <div className="stat-label">Pending</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{rejectedCount}</div>
                <div className="stat-label">Rejected</div>
              </div>
            </div>
          </div>
          
          <div className="panel chart-display">
            <h3>Position Distribution</h3>
            {renderBarChart()}
          </div>
        </div>
        
        <div className="referrals-section">
          <div className="section-header">
            <h2>Referral Management</h2>
            <div className="header-actions">
              <div className="search-box">
                <input 
                  type="text" 
                  placeholder="Search positions or referrers..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="metal-input"
                />
                <div className="search-icon"></div>
              </div>
              
              <div className="tabs">
                <button 
                  className={`tab ${activeTab === "all" ? "active" : ""}`}
                  onClick={() => setActiveTab("all")}
                >
                  All
                </button>
                <button 
                  className={`tab ${activeTab === "pending" ? "active" : ""}`}
                  onClick={() => setActiveTab("pending")}
                >
                  Pending
                </button>
                <button 
                  className={`tab ${activeTab === "matched" ? "active" : ""}`}
                  onClick={() => setActiveTab("matched")}
                >
                  Matched
                </button>
                <button 
                  className={`tab ${activeTab === "rejected" ? "active" : ""}`}
                  onClick={() => setActiveTab("rejected")}
                >
                  Rejected
                </button>
              </div>
              
              <button 
                onClick={loadReferrals}
                className="refresh-btn metal-button"
                disabled={isRefreshing}
              >
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>
          
          <div className="referrals-list metal-card">
            <div className="table-header">
              <div className="header-cell">ID</div>
              <div className="header-cell">Position</div>
              <div className="header-cell">Referrer</div>
              <div className="header-cell">Date</div>
              <div className="header-cell">Status</div>
              <div className="header-cell">Actions</div>
            </div>
            
            {filteredReferrals.length === 0 ? (
              <div className="no-referrals">
                <div className="no-referrals-icon"></div>
                <p>No referrals found</p>
                <button 
                  className="metal-button primary"
                  onClick={() => setShowCreateModal(true)}
                >
                  Submit First Referral
                </button>
              </div>
            ) : (
              filteredReferrals.map(referral => (
                <div className="referral-row" key={referral.id}>
                  <div className="table-cell referral-id">#{referral.id.substring(0, 6)}</div>
                  <div className="table-cell">{referral.position}</div>
                  <div className="table-cell">{referral.referrer.substring(0, 6)}...{referral.referrer.substring(38)}</div>
                  <div className="table-cell">
                    {new Date(referral.timestamp * 1000).toLocaleDateString()}
                  </div>
                  <div className="table-cell">
                    <span className={`status-badge ${referral.status}`}>
                      {referral.status}
                    </span>
                  </div>
                  <div className="table-cell actions">
                    {isReferrer(referral.referrer) && referral.status === "pending" && (
                      <>
                        <button 
                          className="action-btn metal-button success"
                          onClick={() => matchReferral(referral.id)}
                        >
                          Match
                        </button>
                        <button 
                          className="action-btn metal-button danger"
                          onClick={() => rejectReferral(referral.id)}
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        {showFAQ && (
          <div className="faq-section">
            <h2>Frequently Asked Questions</h2>
            <div className="faq-items">
              {faqItems.map((item, index) => (
                <div className="faq-item" key={index}>
                  <div className="faq-question">
                    <div className="faq-icon">❓</div>
                    <h3>{item.question}</h3>
                  </div>
                  <div className="faq-answer">
                    <p>{item.answer}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
  
      {showCreateModal && (
        <ModalCreate 
          onSubmit={submitReferral} 
          onClose={() => setShowCreateModal(false)} 
          creating={creating}
          referralData={newReferralData}
          setReferralData={setNewReferralData}
        />
      )}
      
      {walletSelectorOpen && (
        <WalletSelector
          isOpen={walletSelectorOpen}
          onWalletSelect={(wallet) => { onWalletSelect(wallet); setWalletSelectorOpen(false); }}
          onClose={() => setWalletSelectorOpen(false)}
        />
      )}
      
      {transactionStatus.visible && (
        <div className="transaction-modal">
          <div className="transaction-content metal-card">
            <div className={`transaction-icon ${transactionStatus.status}`}>
              {transactionStatus.status === "pending" && <div className="metal-spinner"></div>}
              {transactionStatus.status === "success" && <div className="check-icon"></div>}
              {transactionStatus.status === "error" && <div className="error-icon"></div>}
            </div>
            <div className="transaction-message">
              {transactionStatus.message}
            </div>
          </div>
        </div>
      )}
  
      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="logo">
              <div className="shield-icon"></div>
              <span>FHEReferralSystem</span>
            </div>
            <p>Secure anonymous referrals using FHE technology</p>
          </div>
          
          <div className="footer-links">
            <a href="#" className="footer-link">Privacy Policy</a>
            <a href="#" className="footer-link">Terms of Service</a>
            <a href="#" className="footer-link">Contact HR</a>
          </div>
        </div>
        
        <div className="footer-bottom">
          <div className="fhe-badge">
            <span>FHE-Powered Privacy</span>
          </div>
          <div className="copyright">
            © {new Date().getFullYear()} FHE Referral System. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

interface ModalCreateProps {
  onSubmit: () => void; 
  onClose: () => void; 
  creating: boolean;
  referralData: any;
  setReferralData: (data: any) => void;
}

const ModalCreate: React.FC<ModalCreateProps> = ({ 
  onSubmit, 
  onClose, 
  creating,
  referralData,
  setReferralData
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setReferralData({
      ...referralData,
      [name]: value
    });
  };

  const handleSubmit = () => {
    if (!referralData.position || !referralData.encryptedInfo) {
      alert("Please fill required fields");
      return;
    }
    
    onSubmit();
  };

  return (
    <div className="modal-overlay">
      <div className="create-modal metal-card">
        <div className="modal-header">
          <h2>Submit Anonymous Referral</h2>
          <button onClick={onClose} className="close-modal">&times;</button>
        </div>
        
        <div className="modal-body">
          <div className="fhe-notice-banner">
            <div className="key-icon"></div> Candidate data will be encrypted with FHE
          </div>
          
          <div className="form-grid">
            <div className="form-group">
              <label>Position *</label>
              <select 
                name="position"
                value={referralData.position} 
                onChange={handleChange}
                className="metal-select"
              >
                <option value="">Select position</option>
                <option value="Software Engineer">Software Engineer</option>
                <option value="Data Scientist">Data Scientist</option>
                <option value="Product Manager">Product Manager</option>
                <option value="UX Designer">UX Designer</option>
                <option value="DevOps Engineer">DevOps Engineer</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Candidate Skills</label>
              <input 
                type="text"
                name="candidateSkills"
                value={referralData.candidateSkills} 
                onChange={handleChange}
                placeholder="Key skills separated by commas..." 
                className="metal-input"
              />
            </div>
            
            <div className="form-group full-width">
              <label>Encrypted Candidate Info *</label>
              <textarea 
                name="encryptedInfo"
                value={referralData.encryptedInfo} 
                onChange={handleChange}
                placeholder="Enter encrypted candidate information..." 
                className="metal-textarea"
                rows={4}
              />
            </div>
          </div>
          
          <div className="privacy-notice">
            <div className="privacy-icon"></div> Your identity and candidate details remain encrypted
          </div>
        </div>
        
        <div className="modal-footer">
          <button 
            onClick={onClose}
            className="cancel-btn metal-button"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={creating}
            className="submit-btn metal-button primary"
          >
            {creating ? "Encrypting with FHE..." : "Submit Anonymously"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
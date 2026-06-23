package service.bloodbankservice.bloodbankservice.dto;

import java.time.LocalDate;

public class DonorResponse {
    private String bloodBankId;
    private String name;
    private String contactNo;
    private String donorId;
    private LocalDate lastdate;
    private String bloodgroup;

    // Constructors
    public DonorResponse() {}

    public DonorResponse(String bloodBankId, String name, String contactNo, String donorId, LocalDate lastdate, String bloodgroup) {
        this.bloodBankId = bloodBankId;
        this.name = name;
        this.contactNo = contactNo;
        this.donorId = donorId;
        this.lastdate = lastdate;
        this.bloodgroup = bloodgroup;
    }

    // Getters and Setters
    public String getBloodBankId() { return bloodBankId; }
    public void setBloodBankId(String bloodBankId) { this.bloodBankId = bloodBankId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getContactNo() { return contactNo; }
    public void setContactNo(String contactNo) { this.contactNo = contactNo; }

    public String getDonorId() { return donorId; }
    public void setDonorId(String donorId) { this.donorId = donorId; }

    public LocalDate getLastdate() { return lastdate; }
    public void setLastdate(LocalDate lastdate) { this.lastdate = lastdate; }

    public String getBloodgroup() { return bloodgroup; }
    public void setBloodgroup(String bloodgroup) { this.bloodgroup = bloodgroup; }
}

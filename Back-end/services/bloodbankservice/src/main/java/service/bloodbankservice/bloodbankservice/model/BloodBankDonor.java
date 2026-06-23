package service.bloodbankservice.bloodbankservice.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "blood_bank_donors")
@Data 
@NoArgsConstructor 
@AllArgsConstructor 
@Builder
public class BloodBankDonor {
    @Id 
    private String bloodBankId; // Mapped manually to support format "bb_donor_xxx"
    
    private String name;
    private String contactNo;
    private String donorId;
    private String lastdate;
    private String bloodgroup;
}
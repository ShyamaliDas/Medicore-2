package service.bloodbankservice.bloodbankservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import service.bloodbankservice.bloodbankservice.model.BloodBankDonor;

import java.util.List;
import java.util.Optional;

@Repository
public interface BloodBankRepository extends JpaRepository<BloodBankDonor, String> {
    List<BloodBankDonor> findByBloodgroup(String bloodgroup);
    Optional<BloodBankDonor> findByDonorId(String donorId);
}
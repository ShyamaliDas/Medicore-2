package service.userservice.userservice.repository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import service.userservice.userservice.model.DoctorProfile;
import java.util.List;

@Repository
public interface DoctorProfileRepository extends JpaRepository<DoctorProfile, String> {
    List<DoctorProfile> findByApprovalTrue();
    long countByApprovalTrue();
}
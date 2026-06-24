package service.userservice.userservice.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import service.userservice.userservice.model.DoctorProfile;

@Repository
/*public interface DoctorProfileRepository extends JpaRepository<DoctorProfile, String> {
    List<DoctorProfile> findByApprovalTrue();
    long countByApprovalTrue();

    /*@Query("SELECT d FROM DoctorProfile d WHERE d.approval = true "
            + "AND (:specialization IS NULL OR LOWER(d.specialization) LIKE LOWER(CONCAT('%', :specialization, '%'))) "
            + "AND (:location IS NULL OR LOWER(d.location) LIKE LOWER(CONCAT('%', :location, '%')))")*/
    List<DoctorProfile> searchApprovedDoctors(
            @Param("specialization") String specialization,
            @Param("location") String location);
}*/